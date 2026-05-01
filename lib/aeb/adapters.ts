import type {
  AebTarget,
  EvidenceCapsuleWithRelations,
  JsonObject,
} from "@/lib/domain/types";
import type {
  AebAdapter,
  AebPayloadPreview,
  PayloadValidationResult,
} from "@/lib/aeb/types";
import {
  AEB_TARGETS,
  allDocuments,
  attachValidation,
  buildBasePreview,
  documentByType,
  evidenceGapsForTarget,
  fieldValue,
  firstField,
  isAebTarget,
  type PayloadRequirement,
  validateRequirements,
} from "@/lib/aeb/helpers";

const COMMON_FIELD_KEYS = [
  "exporter",
  "exporter_address",
  "consignee",
  "consignee_address",
  "destination_country",
  "invoice_value",
  "currency",
  "line_items",
  "line_item_count",
  "hs_code",
  "classification",
  "commodity_code",
  "country_of_origin",
  "origin_country",
  "origin_evidence",
  "gross_weight_kg",
  "gross_weight",
  "net_weight_kg",
  "net_weight",
  "package_count",
  "packages",
  "dimensions",
  "product_description",
  "product_attributes",
  "technical_attributes",
  "technical_parameters_complete",
  "operating_temperature_range",
  "end_user",
  "end_user_address",
  "end_use",
  "end_use_statement_status",
  "risk_questionnaire_status",
  "risk_questionnaire_date",
  "license_reference",
  "license_evidence",
  "no_license_required",
];

abstract class BaseMockAebAdapter implements AebAdapter {
  abstract target: AebTarget;
  protected abstract requirements: PayloadRequirement[];

  buildPayload(capsule: EvidenceCapsuleWithRelations): AebPayloadPreview {
    const preview = buildBasePreview({
      capsule,
      target: this.target,
      payload: this.createPayload(capsule),
      sourceKeys: this.sourceKeys(),
    });
    const validation = this.validatePayload(preview);

    return attachValidation(capsule, preview, validation);
  }

  validatePayload(payload: AebPayloadPreview): PayloadValidationResult {
    return validateRequirements(payload, this.requirements);
  }

  protected sourceKeys(): string[] {
    return COMMON_FIELD_KEYS;
  }

  protected abstract createPayload(
    capsule: EvidenceCapsuleWithRelations,
  ): JsonObject;

  protected baseContext(capsule: EvidenceCapsuleWithRelations) {
    return {
      adapter: "mock AEB adapter",
      payloadType: "AEB-compatible payload preview",
      capsuleNumber: capsule.capsuleNumber,
      disclaimer:
        "Demo prototype only. This preview is not a filing, screening result, tariff classification or export-control decision.",
    };
  }

  protected commonDocuments(capsule: EvidenceCapsuleWithRelations) {
    return {
      commercialInvoice: documentByType(capsule, "commercialInvoice"),
      packingList: documentByType(capsule, "packingList"),
      erpExport: documentByType(capsule, "erpExport"),
      technicalDatasheet: documentByType(capsule, "technicalDatasheet"),
      endUseStatement: documentByType(capsule, "endUseStatement"),
      supplierEvidence: documentByType(capsule, "supplierEvidence"),
      brokerEmail: documentByType(capsule, "brokerEmail"),
      all: allDocuments(capsule),
    };
  }
}

export class CustomsBrokerIntegrationAdapter extends BaseMockAebAdapter {
  target = "CUSTOMS_BROKER_INTEGRATION" as const;
  protected requirements: PayloadRequirement[] = [
    {
      code: "BROKER_MISSING_INVOICE_DOCUMENT",
      message: "Commercial invoice document is required for broker handover.",
      severity: "blocking",
      path: "documents.commercialInvoice",
    },
    {
      code: "BROKER_MISSING_PACKING_LIST",
      message: "Packing list document is required for broker handover.",
      severity: "blocking",
      path: "documents.packingList",
    },
    {
      code: "BROKER_MISSING_EXPORTER",
      message: "Exporter is missing from the broker handover preview.",
      severity: "blocking",
      path: "parties.exporter.name",
      fieldKey: "exporter",
    },
    {
      code: "BROKER_MISSING_CONSIGNEE",
      message: "Consignee is missing from the broker handover preview.",
      severity: "blocking",
      path: "parties.consignee.name",
      fieldKey: "consignee",
    },
    {
      code: "BROKER_MISSING_INVOICE_VALUE",
      message: "Invoice value and currency are required for broker handover.",
      severity: "blocking",
      path: "invoiceSummary.value",
      fieldKey: "invoice_value",
    },
    {
      code: "BROKER_MISSING_CURRENCY",
      message: "Invoice currency is required for broker handover.",
      severity: "blocking",
      path: "invoiceSummary.currency",
      fieldKey: "currency",
    },
    {
      code: "BROKER_MISSING_CLASSIFICATION",
      message: "HS code or classification should be present for broker handover readiness.",
      severity: "warning",
      anyOf: ["lineItems.0.hsCode", "lineItems.0.classification"],
      fieldKey: "hs_code",
    },
    {
      code: "BROKER_MISSING_ORIGIN",
      message: "Country of origin should be present for broker handover readiness.",
      severity: "warning",
      path: "lineItems.0.countryOfOrigin",
      fieldKey: "country_of_origin",
    },
  ];

  protected createPayload(capsule: EvidenceCapsuleWithRelations): JsonObject {
    return {
      ...this.baseContext(capsule),
      workflow: "customsBrokerHandover",
      parties: {
        exporter: {
          name: fieldValue(capsule, ["exporter"]),
          address: fieldValue(capsule, ["exporter_address"]),
        },
        consignee: {
          name: fieldValue(capsule, ["consignee"], capsule.customerName),
          address: fieldValue(capsule, ["consignee_address"]),
        },
        endUser: {
          name: fieldValue(capsule, ["end_user"]),
          address: fieldValue(capsule, ["end_user_address"]),
        },
      },
      shipmentReferences: {
        capsuleNumber: capsule.capsuleNumber,
        incoterm: capsule.incoterm,
        destinationCountry: fieldValue(
          capsule,
          ["destination_country"],
          capsule.destinationCountry,
        ),
      },
      invoiceSummary: {
        value: fieldValue(capsule, ["invoice_value"]),
        currency: fieldValue(capsule, ["currency"]),
      },
      lineItems: [
        {
          lineItemCount: fieldValue(capsule, ["line_item_count", "line_items"]),
          description: fieldValue(capsule, ["product_description"]),
          hsCode: fieldValue(capsule, ["hs_code", "commodity_code"]),
          classification: fieldValue(capsule, ["classification"]),
          countryOfOrigin: fieldValue(capsule, [
            "country_of_origin",
            "origin_country",
          ]),
        },
      ],
      packages: packagePreview(capsule),
      documents: this.commonDocuments(capsule),
      evidenceGaps: evidenceGapsForTarget(capsule, this.target),
    };
  }
}

export class CustomsManagementAdapter extends BaseMockAebAdapter {
  target = "CUSTOMS_MANAGEMENT" as const;
  protected requirements: PayloadRequirement[] = [
    {
      code: "CUSTOMS_MISSING_EXPORTER",
      message: "Exporter is mandatory for customs-management payload readiness.",
      severity: "blocking",
      path: "masterData.exporter.name",
      fieldKey: "exporter",
    },
    {
      code: "CUSTOMS_MISSING_CONSIGNEE",
      message: "Consignee is mandatory for customs-management payload readiness.",
      severity: "blocking",
      path: "masterData.consignee.name",
      fieldKey: "consignee",
    },
    {
      code: "CUSTOMS_MISSING_DESTINATION",
      message: "Destination country is mandatory for customs-management payload readiness.",
      severity: "blocking",
      path: "masterData.destinationCountry",
      fieldKey: "destination_country",
    },
    {
      code: "CUSTOMS_MISSING_VALUE",
      message: "Invoice value is mandatory for customs-management payload readiness.",
      severity: "blocking",
      path: "valuation.invoiceValue",
      fieldKey: "invoice_value",
    },
    {
      code: "CUSTOMS_MISSING_CURRENCY",
      message: "Currency is mandatory for customs-management payload readiness.",
      severity: "blocking",
      path: "valuation.currency",
      fieldKey: "currency",
    },
    {
      code: "CUSTOMS_MISSING_LINE_ITEMS",
      message: "At least one line item is mandatory for customs-management payload readiness.",
      severity: "blocking",
      path: "lineItems.0.lineItemCount",
      fieldKey: "line_item_count",
    },
    {
      code: "CUSTOMS_INCOMPLETE_CLASSIFICATION_OR_ORIGIN",
      message: "Classification and origin evidence are incomplete.",
      severity: "warning",
      anyOf: ["lineItems.0.hsCode", "lineItems.0.originEvidence"],
      fieldKey: "origin_evidence",
    },
  ];

  protected createPayload(capsule: EvidenceCapsuleWithRelations): JsonObject {
    return {
      ...this.baseContext(capsule),
      workflow: "customsManagement",
      masterData: {
        exporter: {
          name: fieldValue(capsule, ["exporter"]),
          address: fieldValue(capsule, ["exporter_address"]),
        },
        consignee: {
          name: fieldValue(capsule, ["consignee"], capsule.customerName),
          address: fieldValue(capsule, ["consignee_address"]),
        },
        destinationCountry: fieldValue(
          capsule,
          ["destination_country"],
          capsule.destinationCountry,
        ),
        incoterm: capsule.incoterm,
      },
      valuation: {
        invoiceValue: fieldValue(capsule, ["invoice_value"]),
        currency: fieldValue(capsule, ["currency"]),
      },
      lineItems: [
        {
          lineItemCount: fieldValue(capsule, ["line_item_count", "line_items"]),
          description: fieldValue(capsule, ["product_description"]),
          hsCode: fieldValue(capsule, ["hs_code", "commodity_code"]),
          origin: fieldValue(capsule, ["country_of_origin", "origin_country"]),
          originEvidence: fieldValue(capsule, ["origin_evidence"]),
          classificationPlaceholder:
            "Preview only; this MVP does not classify goods.",
        },
      ],
      documents: this.commonDocuments(capsule),
      evidenceGaps: evidenceGapsForTarget(capsule, this.target),
    };
  }
}

export class ProductClassificationAdapter extends BaseMockAebAdapter {
  target = "PRODUCT_CLASSIFICATION" as const;
  protected requirements: PayloadRequirement[] = [
    {
      code: "CLASSIFICATION_MISSING_DESCRIPTION",
      message: "Product description is required for a classification request preview.",
      severity: "warning",
      path: "products.0.description",
      fieldKey: "product_description",
    },
    {
      code: "CLASSIFICATION_MISSING_ATTRIBUTES",
      message: "Technical or product attributes are missing.",
      severity: "warning",
      anyOf: ["products.0.technicalAttributes", "products.0.productAttributes"],
      fieldKey: "product_attributes",
    },
    {
      code: "CLASSIFICATION_MISSING_DATASHEET",
      message: "Technical datasheet should be attached for classification readiness.",
      severity: "warning",
      path: "documents.technicalDatasheet",
    },
  ];

  protected createPayload(capsule: EvidenceCapsuleWithRelations): JsonObject {
    return {
      ...this.baseContext(capsule),
      workflow: "productClassification",
      products: [
        {
          description: fieldValue(capsule, ["product_description"]),
          productAttributes: fieldValue(capsule, ["product_attributes"]),
          technicalAttributes: fieldValue(capsule, ["technical_attributes"]),
          existingClassification: fieldValue(capsule, [
            "hs_code",
            "classification",
            "commodity_code",
          ]),
          datasheetSourceRef: firstField(capsule, [
            "product_attributes",
            "technical_attributes",
            "product_description",
          ])?.sourceRef,
        },
      ],
      documents: this.commonDocuments(capsule),
      evidenceGaps: evidenceGapsForTarget(capsule, this.target),
      nonGoal:
        "This preview prepares evidence for a classification workflow; it does not classify the product.",
    };
  }
}

export class ExportControlsAdapter extends BaseMockAebAdapter {
  target = "EXPORT_CONTROLS" as const;
  protected requirements: PayloadRequirement[] = [
    {
      code: "EXPORT_MISSING_TECHNICAL_PARAMETERS",
      message: "Technical parameters required for export-control readiness are missing.",
      severity: "blocking",
      anyOf: [
        "goodsAttributes.technicalParametersComplete",
        "goodsAttributes.technicalAttributes",
        "goodsAttributes.productAttributes",
      ],
      fieldKey: "technical_parameters_complete",
    },
    {
      code: "EXPORT_MISSING_DESTINATION",
      message: "Destination country is required for export-control readiness.",
      severity: "blocking",
      path: "transaction.destinationCountry",
      fieldKey: "destination_country",
    },
    {
      code: "EXPORT_MISSING_END_USER",
      message: "End user evidence is required for export-control readiness.",
      severity: "blocking",
      path: "endUseEvidence.endUser.name",
      fieldKey: "end_user",
    },
    {
      code: "EXPORT_MISSING_END_USE",
      message: "End use evidence is required for export-control readiness.",
      severity: "blocking",
      path: "endUseEvidence.endUse",
      fieldKey: "end_use",
    },
    {
      code: "EXPORT_MISSING_END_USE_STATEMENT",
      message: "End-use statement document is required where review evidence is needed.",
      severity: "blocking",
      path: "documents.endUseStatement",
    },
  ];

  protected createPayload(capsule: EvidenceCapsuleWithRelations): JsonObject {
    return {
      ...this.baseContext(capsule),
      workflow: "exportControls",
      goodsAttributes: {
        description: fieldValue(capsule, ["product_description"]),
        productAttributes: fieldValue(capsule, ["product_attributes"]),
        technicalAttributes: fieldValue(capsule, ["technical_attributes"]),
        technicalParametersComplete: fieldValue(capsule, [
          "technical_parameters_complete",
        ]),
        operatingTemperatureRange: fieldValue(capsule, [
          "operating_temperature_range",
        ]),
      },
      transaction: {
        destinationCountry: fieldValue(
          capsule,
          ["destination_country"],
          capsule.destinationCountry,
        ),
        customerName: capsule.customerName,
      },
      endUseEvidence: {
        endUser: {
          name: fieldValue(capsule, ["end_user"]),
          address: fieldValue(capsule, ["end_user_address"]),
        },
        endUse: fieldValue(capsule, ["end_use"]),
        statementStatus: fieldValue(capsule, ["end_use_statement_status"]),
      },
      documents: this.commonDocuments(capsule),
      evidenceGaps: evidenceGapsForTarget(capsule, this.target),
      nonConclusion:
        "This preview does not determine export-control status or license requirements.",
    };
  }
}

export class RiskAssessmentAdapter extends BaseMockAebAdapter {
  target = "RISK_ASSESSMENT" as const;
  protected requirements: PayloadRequirement[] = [
    {
      code: "RISK_MISSING_QUESTIONNAIRE_STATUS",
      message: "Questionnaire status is required for risk assessment readiness.",
      severity: "blocking",
      path: "questionnaire.status",
      fieldKey: "risk_questionnaire_status",
    },
    {
      code: "RISK_MISSING_QUESTIONNAIRE_DATE",
      message: "Questionnaire date is required for risk assessment readiness.",
      severity: "blocking",
      path: "questionnaire.date",
      fieldKey: "risk_questionnaire_date",
    },
  ];

  protected createPayload(capsule: EvidenceCapsuleWithRelations): JsonObject {
    return {
      ...this.baseContext(capsule),
      workflow: "riskAssessment",
      parties: {
        customerName: capsule.customerName,
        endUser: fieldValue(capsule, ["end_user"]),
      },
      endUse: fieldValue(capsule, ["end_use"]),
      questionnaire: {
        status: fieldValue(capsule, ["risk_questionnaire_status"]),
        date: fieldValue(capsule, ["risk_questionnaire_date"]),
        evidenceSourceRef: firstField(capsule, [
          "risk_questionnaire_status",
          "risk_questionnaire_date",
        ])?.sourceRef,
      },
      missingAnswers: capsule.missingEvidence
        .filter((item) => item.requiredForTarget === this.target)
        .map((item) => item.label),
      documents: this.commonDocuments(capsule),
      evidenceGaps: evidenceGapsForTarget(capsule, this.target),
    };
  }
}

export class ComplianceScreeningAdapter extends BaseMockAebAdapter {
  target = "COMPLIANCE_SCREENING" as const;
  protected requirements: PayloadRequirement[] = [
    {
      code: "SCREENING_MISSING_EXPORTER_ADDRESS",
      message: "Exporter name and address should be present for screening handoff readiness.",
      severity: "warning",
      path: "parties.exporter.address",
      fieldKey: "exporter_address",
    },
    {
      code: "SCREENING_MISSING_CONSIGNEE_ADDRESS",
      message: "Consignee name and address should be present for screening handoff readiness.",
      severity: "warning",
      path: "parties.consignee.address",
      fieldKey: "consignee_address",
    },
    {
      code: "SCREENING_MISSING_END_USER_ADDRESS",
      message: "End user name and address should be present for screening handoff readiness.",
      severity: "warning",
      path: "parties.endUser.address",
      fieldKey: "end_user_address",
    },
  ];

  protected createPayload(capsule: EvidenceCapsuleWithRelations): JsonObject {
    return {
      ...this.baseContext(capsule),
      workflow: "complianceScreening",
      parties: {
        exporter: {
          name: fieldValue(capsule, ["exporter"]),
          address: fieldValue(capsule, ["exporter_address"]),
        },
        consignee: {
          name: fieldValue(capsule, ["consignee"], capsule.customerName),
          address: fieldValue(capsule, ["consignee_address"]),
        },
        endUser: {
          name: fieldValue(capsule, ["end_user"]),
          address: fieldValue(capsule, ["end_user_address"]),
        },
      },
      noScreeningPerformed: true,
      nonGoal:
        "This mock AEB adapter prepares party data only. It does not perform sanctions screening.",
      evidenceGaps: evidenceGapsForTarget(capsule, this.target),
    };
  }
}

export class LicenseManagementAdapter extends BaseMockAebAdapter {
  target = "LICENSE_MANAGEMENT" as const;
  protected requirements: PayloadRequirement[] = [
    {
      code: "LICENSE_MISSING_EVIDENCE",
      message: "License reference or no-license-required evidence is missing.",
      severity: "warning",
      anyOf: [
        "licenseEvidence.licenseReference",
        "licenseEvidence.licenseEvidence",
        "licenseEvidence.noLicenseRequired",
      ],
      fieldKey: "license_reference",
    },
  ];

  protected createPayload(capsule: EvidenceCapsuleWithRelations): JsonObject {
    return {
      ...this.baseContext(capsule),
      workflow: "licenseManagement",
      licenseEvidence: {
        exportControlStatus: fieldValue(capsule, ["export_control_status"]),
        licenseReference: fieldValue(capsule, ["license_reference"]),
        licenseEvidence: fieldValue(capsule, ["license_evidence"]),
        noLicenseRequired: fieldValue(capsule, ["no_license_required"]),
      },
      documents: this.commonDocuments(capsule),
      evidenceGaps: evidenceGapsForTarget(capsule, this.target),
      nonConclusion:
        "This preview does not decide whether a license is legally required.",
    };
  }
}

export class CarrierConnectAdapter extends BaseMockAebAdapter {
  target = "CARRIER_CONNECT" as const;
  protected requirements: PayloadRequirement[] = [
    {
      code: "CARRIER_MISSING_PACKAGE_COUNT",
      message: "Package count is required for carrier handoff readiness.",
      severity: "warning",
      path: "packages.packageCount",
      fieldKey: "package_count",
    },
    {
      code: "CARRIER_MISSING_GROSS_WEIGHT",
      message: "Gross weight is required for carrier handoff readiness.",
      severity: "warning",
      path: "packages.grossWeightKg",
      fieldKey: "gross_weight_kg",
    },
    {
      code: "CARRIER_MISSING_DIMENSIONS",
      message: "Dimensions are required for carrier handoff readiness.",
      severity: "warning",
      path: "packages.dimensions",
      fieldKey: "dimensions",
    },
  ];

  protected createPayload(capsule: EvidenceCapsuleWithRelations): JsonObject {
    return {
      ...this.baseContext(capsule),
      workflow: "carrierConnect",
      shipment: {
        capsuleNumber: capsule.capsuleNumber,
        destinationCountry: fieldValue(
          capsule,
          ["destination_country"],
          capsule.destinationCountry,
        ),
        incoterm: capsule.incoterm,
      },
      packages: packagePreview(capsule),
      documents: this.commonDocuments(capsule),
      evidenceGaps: evidenceGapsForTarget(capsule, this.target),
    };
  }
}

export const aebAdapters: Record<AebTarget, AebAdapter> = {
  CUSTOMS_BROKER_INTEGRATION: new CustomsBrokerIntegrationAdapter(),
  CUSTOMS_MANAGEMENT: new CustomsManagementAdapter(),
  PRODUCT_CLASSIFICATION: new ProductClassificationAdapter(),
  EXPORT_CONTROLS: new ExportControlsAdapter(),
  COMPLIANCE_SCREENING: new ComplianceScreeningAdapter(),
  LICENSE_MANAGEMENT: new LicenseManagementAdapter(),
  RISK_ASSESSMENT: new RiskAssessmentAdapter(),
  CARRIER_CONNECT: new CarrierConnectAdapter(),
};

export function getAebAdapter(target: AebTarget): AebAdapter {
  return aebAdapters[target];
}

export function buildAebPayloadPreview(
  capsule: EvidenceCapsuleWithRelations,
  target: AebTarget,
): AebPayloadPreview {
  return getAebAdapter(target).buildPayload(capsule);
}

export function parseAebTarget(value: string): AebTarget | undefined {
  return isAebTarget(value) ? value : undefined;
}

export { AEB_TARGETS };

function packagePreview(capsule: EvidenceCapsuleWithRelations) {
  return {
    packageCount: fieldValue(capsule, ["package_count", "packages"]),
    grossWeightKg: fieldValue(capsule, ["gross_weight_kg", "gross_weight"]),
    netWeightKg: fieldValue(capsule, ["net_weight_kg", "net_weight"]),
    dimensions: fieldValue(capsule, ["dimensions"]),
  };
}

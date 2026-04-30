import { PrismaClient } from "@prisma/client";

import { demoEvidenceCapsules } from "../lib/domain/demo-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.evidenceCapsule.deleteMany();

  for (const capsule of demoEvidenceCapsules) {
    await prisma.evidenceCapsule.create({
      data: {
        reference: capsule.reference,
        shipper: capsule.shipper,
        consignee: capsule.consignee,
        readinessScore: capsule.readinessScore,
        status: capsule.status,
        missingEvidenceJson: JSON.stringify(capsule.missingEvidence),
        contradictionsJson: JSON.stringify(capsule.contradictions),
        invoiceValue: capsule.invoiceValue,
        packingGrossWeightKg: capsule.packingGrossWeightKg,
        erpGrossWeightKg: capsule.erpGrossWeightKg,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

-- CreateTable
CREATE TABLE "AgendamentoLote" (
    "id" SERIAL NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendamentoLote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgendamentoLote" ADD CONSTRAINT "AgendamentoLote_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN "loteId" INTEGER;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "AgendamentoLote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

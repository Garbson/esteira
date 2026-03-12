// ============================================================
// 📌 CONTROLE DE VERSÃO DA ESTEIRA
// ============================================================
// Atualize aqui a cada deploy/release importante.
// A versão aparece no rodapé e no header do sistema.
//
// Formato: MAJOR.MINOR.PATCH
//   MAJOR → Mudança grande (ex: novo módulo, redesign)
//   MINOR → Funcionalidade nova (ex: novo filtro, campo)
//   PATCH → Correção de bug ou ajuste pequeno
// ============================================================

export const APP_VERSION = "1.1.0";

export const CHANGELOG = [
  {
    versao: "1.1.0",
    data: "2026-03-12",
    mudancas: [
      "🖱️ Drag and Drop — arraste cards entre colunas",
      "↔ Mover para qualquer etapa (não só a próxima)",
      "🎯 Visual de destaque ao arrastar sobre uma coluna",
      "📋 Modal de mover agora mostra todas as colunas disponíveis",
    ],
  },
  {
    versao: "1.0.0",
    data: "2026-03-12",
    mudancas: [
      "🚀 Lançamento inicial da Esteira de Processamento",
      "📥 Kanban com 6 colunas de status",
      "🔥 Integração com Firebase Firestore (tempo real)",
      "👤 Usuários: Boaventura, Garbson, Felipe, Natalia, ISA, Print Center",
      "🏷️ Sistema de prioridades (Normal, Urgente, Crítico)",
      "💬 Observações ao mover arquivos",
      "📋 Histórico completo de movimentações",
      "🔍 Busca por nome e filtro por responsável",
      "⏱️ Indicador de tempo no status",
      "⚠️ Confirmação antes de excluir",
      "📊 Dashboard com contadores e % de progresso",
    ],
  },
];

import { useEffect, useMemo, useState } from "react";
import {
  addItem as firebaseAddItem,
  removeItem as firebaseRemoveItem,
  updateItem as firebaseUpdateItem,
  onItemsChange,
} from "./firebase";

const COLUMNS = [
  {
    id: "aguardando",
    label: "Aguardando Processamento",
    color: "#6366f1",
    icon: "📥",
    bg: "#eef2ff",
  },
  {
    id: "processando",
    label: "Em Processamento",
    color: "#f59e0b",
    icon: "⚙️",
    bg: "#fffbeb",
  },
  {
    id: "erro",
    label: "Erro - Em Correção",
    color: "#ef4444",
    icon: "🔴",
    bg: "#fef2f2",
  },
  {
    id: "isa",
    label: "Aguardando ISA",
    color: "#8b5cf6",
    icon: "📤",
    bg: "#f5f3ff",
  },
  {
    id: "print",
    label: "Na Print Center",
    color: "#3b82f6",
    icon: "🖨️",
    bg: "#eff6ff",
  },
  {
    id: "concluido",
    label: "Concluído",
    color: "#10b981",
    icon: "✅",
    bg: "#ecfdf5",
  },
];

const USERS = [
  "Boaventura",
  "Garbson",
  "Felipe",
  "Natalia",
  "ISA",
  "Print Center",
];

const PRIORIDADES = [
  { id: "normal", label: "Normal", color: "#64748b", icon: "⬜" },
  { id: "urgente", label: "Urgente", color: "#f59e0b", icon: "🟡" },
  { id: "critico", label: "Crítico", color: "#ef4444", icon: "🔴" },
];

const tempoNoStatus = (item) => {
  const ultimaMovimentacao = item.historico[item.historico.length - 1]?.data;
  if (!ultimaMovimentacao) return "";
  const diff = Date.now() - new Date(ultimaMovimentacao).getTime();
  const minutos = Math.floor(diff / 60000);
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h`;
  const dias = Math.floor(horas / 24);
  return `${dias}d`;
};

const formatDate = (d) => {
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
};

const getNextStatuses = (current) => {
  const map = {
    aguardando: ["processando"],
    processando: ["erro", "isa"],
    erro: ["isa"],
    isa: ["print"],
    print: ["concluido", "erro"],
    concluido: [],
  };
  return map[current] || [];
};

const getColumnLabel = (id) => COLUMNS.find((c) => c.id === id)?.label || id;

// Modal overlay (fora do componente para evitar re-render e perda de foco)
const Modal = ({ children, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15,23,42,0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 32,
        minWidth: 400,
        maxWidth: 500,
        boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
      }}
    >
      {children}
    </div>
  </div>
);

export default function EsteiraKanban() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistModal, setShowHistModal] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [newItem, setNewItem] = useState({
    nome: "",
    faturas: "",
    prioridade: "normal",
  });
  const [moveUser, setMoveUser] = useState("");
  const [moveTarget, setMoveTarget] = useState("");
  const [moveObs, setMoveObs] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState("");

  // 🔥 Escuta mudanças em tempo real do Firebase
  useEffect(() => {
    const unsubscribe = onItemsChange((firebaseItems) => {
      setItems(firebaseItems);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addItem = async () => {
    if (!newItem.nome.trim() || !newItem.faturas) return;
    const item = {
      nome: newItem.nome.trim().toUpperCase(),
      faturas: parseInt(newItem.faturas),
      status: "aguardando",
      responsavel: "Boaventura",
      prioridade: newItem.prioridade || "normal",
      observacao: "",
      historico: [
        {
          de: null,
          para: "aguardando",
          usuario: "Boaventura",
          data: new Date().toISOString(),
          obs: "",
        },
      ],
    };
    await firebaseAddItem(item);
    setNewItem({ nome: "", faturas: "", prioridade: "normal" });
    setShowAddModal(false);
  };

  const moveItem = async (itemId) => {
    if (!moveUser || !moveTarget) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    await firebaseUpdateItem(itemId, {
      status: moveTarget,
      responsavel: moveUser,
      observacao: moveObs || item.observacao,
      historico: [
        ...item.historico,
        {
          de: item.status,
          para: moveTarget,
          usuario: moveUser,
          data: new Date().toISOString(),
          obs: moveObs,
        },
      ],
    });
    setShowMoveModal(null);
    setMoveUser("");
    setMoveTarget("");
    setMoveObs("");
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    await firebaseRemoveItem(showDeleteConfirm.id);
    setShowDeleteConfirm(null);
  };

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchSearch = i.nome
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchUser = filterUser ? i.responsavel === filterUser : true;
      return matchSearch && matchUser;
    });
  }, [items, searchTerm, filterUser]);

  const totalFaturas = items.reduce((s, i) => s + i.faturas, 0);
  const erroCount = items.filter((i) => i.status === "erro").length;
  const concluidoCount = items.filter((i) => i.status === "concluido").length;
  const progressPercent =
    items.length > 0 ? Math.round((concluidoCount / items.length) * 100) : 0;

  // Tela de loading
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: "4px solid rgba(255,255,255,0.1)",
            borderTop: "4px solid #6366f1",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "#94a3b8", fontSize: 16 }}>Carregando esteira...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        color: "#e2e8f0",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 32px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              background: "linear-gradient(90deg, #6366f1, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Esteira de Processamento
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>
            Controle de arquivos • Print Center
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: 20,
              marginRight: 16,
              padding: "10px 20px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 12,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa" }}>
                {items.length}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Arquivos
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1" }}>
                {totalFaturas.toLocaleString("pt-BR")}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Faturas
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
                {progressPercent}%
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Concluído
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: erroCount > 0 ? "#ef4444" : "#10b981",
                }}
              >
                {erroCount}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Erros
              </div>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="🔍 Buscar arquivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#e2e8f0",
              fontSize: 14,
              outline: "none",
              width: 200,
              transition: "all 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.12)")
            }
          />

          {/* Filter by user */}
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#e2e8f0",
              fontSize: 14,
              outline: "none",
              cursor: "pointer",
              appearance: "auto",
            }}
          >
            <option value="" style={{ background: "#1e293b" }}>
              👤 Todos
            </option>
            {USERS.map((u) => (
              <option key={u} value={u} style={{ background: "#1e293b" }}>
                {u}
              </option>
            ))}
          </select>

          {/* Add button */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.03)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            + Novo Arquivo
          </button>
        </div>
      </div>

      {/* Flow Indicator */}
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {[
          {
            icon: "📥",
            label: "Boaventura/Natalia",
            color: "#6366f1",
            step: 1,
          },
          { icon: "⚙️", label: "Processamento", color: "#f59e0b", step: 2 },
          { icon: "📤", label: "ISA", color: "#8b5cf6", step: 3 },
          { icon: "🖨️", label: "Print Center", color: "#3b82f6", step: 4 },
          { icon: "✅", label: "Concluído", color: "#10b981", step: 5 },
        ].map((s, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: s.color + "18",
                borderRadius: 20,
                border: `1px solid ${s.color}44`,
              }}
            >
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: s.color,
                  whiteSpace: "nowrap",
                }}
              >
                {s.step}. {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <span style={{ fontSize: 16, color: "#475569", margin: "0 8px" }}>
                →
              </span>
            )}
          </div>
        ))}
        <div
          style={{
            marginLeft: 20,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            background: "rgba(239,68,68,0.1)",
            borderRadius: 20,
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <span style={{ fontSize: 14 }}>🔴</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#ef4444",
              whiteSpace: "nowrap",
            }}
          >
            Erro → ISA → Print
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "24px 24px",
          overflowX: "auto",
          minHeight: 200,
          paddingBottom: 32,
        }}
      >
        {COLUMNS.map((col) => {
          const colItems = filteredItems.filter((i) => i.status === col.id);
          const colFaturas = colItems.reduce((s, i) => s + i.faturas, 0);
          return (
            <div
              key={col.id}
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                minWidth: 320,
                flexShrink: 0,
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: "16px 16px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ fontSize: 16 }}>{col.icon}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: col.color,
                      }}
                    >
                      {col.label}
                    </span>
                  </div>
                  <span
                    style={{
                      background: col.color + "22",
                      color: col.color,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "2px 10px",
                      borderRadius: 20,
                    }}
                  >
                    {colItems.length}
                  </span>
                </div>
                {colItems.length > 0 && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "#94a3b8",
                    }}
                  >
                    📄 {colFaturas.toLocaleString("pt-BR")} faturas nesta etapa
                  </div>
                )}
              </div>

              {/* Cards */}
              <div
                style={{
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {colItems.length === 0 && (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "#475569",
                      fontSize: 13,
                      fontStyle: "italic",
                    }}
                  >
                    Nenhum arquivo
                  </div>
                )}
                {colItems.map((item) => {
                  const prio =
                    PRIORIDADES.find((p) => p.id === item.prioridade) ||
                    PRIORIDADES[0];
                  const tempo = tempoNoStatus(item);
                  const dataEntrada = formatDate(item.historico[0]?.data);
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: "#fff",
                        borderRadius: 10,
                        padding: 14,
                        borderLeft: `4px solid ${col.color}`,
                        cursor: "default",
                        transition: "transform 0.15s, box-shadow 0.15s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 6px 16px rgba(0,0,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px rgba(0,0,0,0.1)";
                      }}
                    >
                      {/* Prioridade badge */}
                      {item.prioridade !== "normal" && (
                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            color: prio.color,
                            background: prio.color + "15",
                            padding: "2px 8px",
                            borderRadius: 6,
                            border: `1px solid ${prio.color}33`,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {prio.icon} {prio.label}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1e293b",
                          marginBottom: 6,
                          wordBreak: "break-all",
                          lineHeight: 1.3,
                          paddingRight: item.prioridade !== "normal" ? 70 : 0,
                        }}
                      >
                        {item.nome}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: "#6366f1",
                            fontWeight: 600,
                            background: "#eef2ff",
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {item.faturas.toLocaleString("pt-BR")} faturas
                        </span>
                        {tempo && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "#f59e0b",
                              fontWeight: 600,
                              background: "#fffbeb",
                              padding: "2px 8px",
                              borderRadius: 6,
                            }}
                          >
                            ⏱️ {tempo}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          👤 {item.responsavel}
                        </span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>
                          📅 {dataEntrada}
                        </span>
                      </div>

                      {/* Observação se houver */}
                      {item.observacao && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            background: "#f8fafc",
                            padding: "6px 8px",
                            borderRadius: 6,
                            marginBottom: 8,
                            borderLeft: "3px solid #e2e8f0",
                            fontStyle: "italic",
                          }}
                        >
                          � {item.observacao}
                        </div>
                      )}

                      {/* Card Actions */}
                      <div style={{ display: "flex", gap: 4 }}>
                        {getNextStatuses(item.status).length > 0 && (
                          <button
                            onClick={() => {
                              setShowMoveModal(item);
                              setMoveTarget(getNextStatuses(item.status)[0]);
                            }}
                            style={{
                              flex: 1,
                              padding: "6px 0",
                              borderRadius: 6,
                              border: "none",
                              background: col.color + "18",
                              color: col.color,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Mover →
                          </button>
                        )}
                        <button
                          onClick={() => setShowHistModal(item)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "none",
                            background: "#f1f5f9",
                            color: "#64748b",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          📋
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(item)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "none",
                            background: "#fef2f2",
                            color: "#ef4444",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <h2
            style={{
              margin: "0 0 24px",
              fontSize: 20,
              color: "#1e293b",
              fontWeight: 700,
            }}
          >
            📥 Novo Arquivo
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Nome do Arquivo
              </label>
              <input
                type="text"
                value={newItem.nome}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, nome: e.target.value }))
                }
                placeholder="Ex: ARQ_FATURA_MAR_2026"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Quantidade de Faturas
              </label>
              <input
                type="number"
                value={newItem.faturas}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, faturas: e.target.value }))
                }
                placeholder="Ex: 1500"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Prioridade
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {PRIORIDADES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      setNewItem((prev) => ({ ...prev, prioridade: p.id }))
                    }
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border:
                        newItem.prioridade === p.id
                          ? `2px solid ${p.color}`
                          : "2px solid #e2e8f0",
                      background:
                        newItem.prioridade === p.id ? p.color + "15" : "#fff",
                      color: newItem.prioridade === p.id ? p.color : "#64748b",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#64748b",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={addItem}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Adicionar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Move Modal */}
      {showMoveModal && (
        <Modal
          onClose={() => {
            setShowMoveModal(null);
            setMoveUser("");
            setMoveTarget("");
            setMoveObs("");
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: 20,
              color: "#1e293b",
              fontWeight: 700,
            }}
          >
            Mover Arquivo
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748b" }}>
            <strong>{showMoveModal.nome}</strong>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Mover para
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {getNextStatuses(showMoveModal.status).map((s) => {
                  const col = COLUMNS.find((c) => c.id === s);
                  return (
                    <button
                      key={s}
                      onClick={() => setMoveTarget(s)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border:
                          moveTarget === s
                            ? `2px solid ${col.color}`
                            : "2px solid #e2e8f0",
                        background:
                          moveTarget === s ? col.color + "15" : "#fff",
                        color: moveTarget === s ? col.color : "#64748b",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {col.icon} {col.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Quem está movendo?
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {USERS.map((u) => (
                  <button
                    key={u}
                    onClick={() => setMoveUser(u)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border:
                        moveUser === u
                          ? "2px solid #6366f1"
                          : "2px solid #e2e8f0",
                      background: moveUser === u ? "#eef2ff" : "#fff",
                      color: moveUser === u ? "#6366f1" : "#64748b",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Observação (opcional)
              </label>
              <textarea
                value={moveObs}
                onChange={(e) => setMoveObs(e.target.value)}
                placeholder="Ex: Erro na linha 42, fatura duplicada..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                  resize: "vertical",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                onClick={() => {
                  setShowMoveModal(null);
                  setMoveUser("");
                  setMoveTarget("");
                  setMoveObs("");
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#64748b",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => moveItem(showMoveModal.id)}
                disabled={!moveUser || !moveTarget}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    moveUser && moveTarget
                      ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                      : "#e2e8f0",
                  color: moveUser && moveTarget ? "#fff" : "#94a3b8",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: moveUser && moveTarget ? "pointer" : "not-allowed",
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* History Modal */}
      {showHistModal && (
        <Modal onClose={() => setShowHistModal(null)}>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: 20,
              color: "#1e293b",
              fontWeight: 700,
            }}
          >
            📋 Histórico
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748b" }}>
            <strong>{showHistModal.nome}</strong> •{" "}
            {showHistModal.faturas.toLocaleString("pt-BR")} faturas
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {showHistModal.historico.map((h, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 12, position: "relative" }}
              >
                {/* Timeline line */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 20,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background:
                        i === showHistModal.historico.length - 1
                          ? "#6366f1"
                          : "#e2e8f0",
                      border:
                        i === showHistModal.historico.length - 1
                          ? "3px solid #c7d2fe"
                          : "3px solid #f1f5f9",
                      flexShrink: 0,
                      zIndex: 1,
                    }}
                  />
                  {i < showHistModal.historico.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: "#e2e8f0" }} />
                  )}
                </div>
                <div style={{ paddingBottom: 20, flex: 1 }}>
                  <div
                    style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}
                  >
                    {h.de
                      ? `${getColumnLabel(h.de)} → ${getColumnLabel(h.para)}`
                      : `Entrada: ${getColumnLabel(h.para)}`}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    {h.usuario} • {formatDate(h.data)}
                  </div>
                  {h.obs && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        background: "#f8fafc",
                        padding: "4px 8px",
                        borderRadius: 4,
                        marginTop: 4,
                        borderLeft: "3px solid #e2e8f0",
                        fontStyle: "italic",
                      }}
                    >
                      💬 {h.obs}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowHistModal(null)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#64748b",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            Fechar
          </button>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal onClose={() => setShowDeleteConfirm(null)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 20,
                color: "#1e293b",
                fontWeight: 700,
              }}
            >
              Confirmar Exclusão
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b" }}>
              Tem certeza que deseja excluir{" "}
              <strong style={{ color: "#1e293b" }}>
                {showDeleteConfirm.nome}
              </strong>
              ?
              <br />
              <span style={{ fontSize: 12 }}>
                ({showDeleteConfirm.faturas.toLocaleString("pt-BR")} faturas) —
                Esta ação não pode ser desfeita.
              </span>
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#64748b",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🗑️ Excluir
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

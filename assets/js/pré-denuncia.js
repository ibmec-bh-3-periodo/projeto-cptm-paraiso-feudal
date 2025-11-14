const voltar = document.getElementById('voltar');
const organizador = document.getElementById('organizador');
const facaUmaDenuncia = document.getElementById('faça-uma-denuncia');
const setaVoltar = document.getElementById('setavoltar');

// ========================= VOLTAR PARA A HOME =========================
voltar.addEventListener('click', function () {
  window.location.href = 'home.html';
});

// ========================= FUNÇÃO DE ATIVAR ALERTA =========================
async function ativarAlerta() {
  // tenta buscar cpf do localStorage (compatível com várias chaves)
  let cpfLogado = localStorage.getItem("cpfLogado");
  
  if (!cpfLogado) {
    // fallback: tenta outras chaves possíveis
    const possibleKeys = ["cpf", "usuarioAtual", "usuario"];
    for (const k of possibleKeys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.cpf) { cpfLogado = parsed.cpf; break; }
        } catch (_) {
          if (typeof raw === "string" && raw.replace(/\D/g, "").length >= 3) {
            cpfLogado = raw;
            break;
          }
        }
      }
    }
  }

  console.log("🔎 CPF logado encontrado:", cpfLogado);

  if (!cpfLogado) {
    console.log("❌ Nenhum usuário logado. Não foi possível ativar o alerta.");
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:5001/api/alerta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cpf: cpfLogado,
        alerta: true,
      }),
    });

    if (response.ok) {
      console.log("🚨 ALERTA ATIVADO COM SUCESSO!");
    } else {
      console.error("⚠️ Erro ao ativar alerta:", response.status, await response.text());
    }
  } catch (err) {
    console.error("🌐 Erro de conexão ao ativar alerta:", err);
  }
}

// ========================= BOTÃO VERMELHO GRANDE =========================
organizador.addEventListener('click', async function (e) {
  e.preventDefault();
  await ativarAlerta();
  window.location.href = 'denuncia.html';
});

// ========================= BOTÃO "FAÇA UMA DENÚNCIA" =========================
facaUmaDenuncia.addEventListener('click', async function () {
  await ativarAlerta();
  window.location.href = 'formularioDenuncia.html';
});

// ========================= SETA DE VOLTAR =========================
setaVoltar.addEventListener('click', function () {
  window.location.href = 'home.html';
});
// 1) Referências ao DOM
document.addEventListener('DOMContentLoaded', init);

function $(sel) {
    return document.querySelector(sel);
}

async function init() {
    const form = $('#form-generator');
    const previewEl = $('#preview-result');
    const copyBtn = $('#copy-button');

    const selType = $('#meeting_type');
    const selUser = $('#user_scheduled');
    const selResult = $('#meeting_results');

    // guarda último título gerado na sessão
    let currentTitle = "";

    let usersArr = [];
    let typesArr = [];
    let resultsArr = [];

    // 2 ) Utilitários
    const sanitize = (t) => (t || "")
        .replace(/[|]+/g, "/")
        .trim();

    const trunc = (t, max = 120) => t.length <= max ? t : (t.slice(0, max - 1).trim() + "…");

    // 3) Carregamento de JSON
    const DATA_PATHS = {
        users:"/data/users.json",
        meetingTypes:"/data/meeting-types.json",
        meetingResults: "/data/meeting-results.json",
    };

    async function loadJson(url){
        const res = await fetch(url, {cache: "no-store"});
        if (!res.ok) throw new Error("Erro ao carregar" + url);
        return res.json();
    }

    //Alguns JSONs podem ter chaves diferentes.
    // Estas helpers tentam achar o array certo em cada arquivo.
    const pickUsers = (j) => Array.isArray(j.users) ? j.users : Array.isArray(j.items) ? j.items : Array.isArray(j) ? j : [];
    const pickTypes = (j) => Array.isArray(j.meetingTypes) ? j.meetingTypes : Array.isArray(j.types) ? j.types : Array.isArray(j.items) ? j.items : Array.isArray(j) ? j : [];
    const pickResults = (j) => Array.isArray(j.meeting_results) ? j.meeting_results : Array.isArray(j.results) ? j.results : Array.isArray(j.items) ? j.items : Array.isArray(j) ? j : [];


    // 4) Popular selects
    function fillSelect(selectEl, items, {valueKey = "id", textKey = "name", onlyActive = true} = {}) {
        selectEl.innerHTML = "";
        const frag = document.createDocumentFragment();

        // Adiciona opção vazia/placeholder
        const optEmpty = document.createElement("option");
        optEmpty.value = "";
        optEmpty.textContent = "Selecione";
        frag.appendChild(optEmpty);

        items
            .filter(i => !onlyActive || i.active !== false)
            .forEach(it => {
                const opt = document.createElement("option");
                opt.value = it[valueKey];
                opt.textContent = it[textKey];
                frag.appendChild(opt);
            });

        selectEl.appendChild(frag);
    }

    try {
        const [usersJ, typesJ, resultsJ] = await Promise.all([
            loadJson(DATA_PATHS.users),
            loadJson(DATA_PATHS.meetingTypes),
            loadJson(DATA_PATHS.meetingResults),
        ]);

        usersArr = pickUsers(usersJ);
        typesArr = pickTypes(typesJ);
        resultsArr = pickResults(resultsJ);

        fillSelect(selUser, usersArr);
        fillSelect(selType, typesArr);
        fillSelect(selResult, resultsArr);
    } catch (err) {
        console.error(err);
        alert("Erro ao carregar listas (usuários/tipos/resultados). Ver console.");
        return;
    }

    // 5) Leitura + construção do título
    function readForm() {
        const data = Object.fromEntries(new FormData(form).entries());
        return {
            deal_name: sanitize(data.deal_name),
            meeting_type: sanitize(typesArr.find(t => t.id === data.meeting_type)?.name || ""),
            user_scheduled: sanitize(usersArr.find(u => u.id === data.user_scheduled)?.id || ""),
            meeting_result: sanitize(resultsArr.find(r => r.id === data.meeting_results)?.name || ""),
        };
    }

  // Template do TÍTULO — usa SOMENTE os seus campos
  // Ajuste a ordem e separadores conforme seu padrão interno.
  function buildTitle(d) {
    const parts = [
      `${d.meeting_type} | ${d.meeting_result}`,
      `Negócio: ${d.deal_name}`,
      `Resp: ${d.user_scheduled}`,
    ];
    return trunc(parts.join(" | "), 120);
  }

  // ===== 6) Eventos =====
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = readForm();

    // validação mínima (já tem required no HTML)
    if (!data.deal_name || !data.meeting_type || !data.meeting_result || !data.user_scheduled) {
      console.log(data.deal_name, data.meeting_type, data.meeting_result, data.user_scheduled);
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    currentTitle = buildTitle(data);

    // Atualiza a prévia na tela
    previewEl.textContent = currentTitle;
  });

  // Adicione estas referências no início da função init
  const modal = $('#preview-modal');
  const modalPreview = $('#modal-preview');
  const modalCopyBtn = $('#modal-copy-button');
  const closeBtn = $('.close-button');

  // Modifique o evento do form para mostrar o modal
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = readForm();

    if (!data.deal_name || !data.meeting_type || !data.meeting_result || !data.user_scheduled) {
      console.log(data.deal_name, data.meeting_type, data.meeting_result, data.user_scheduled);
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    currentTitle = buildTitle(data);
    modalPreview.textContent = currentTitle;
    modal.style.display = "block";
  });

  // Adicione eventos para fechar o modal
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  // Modifique o evento de copiar para usar o botão do modal
  modalCopyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(currentTitle);
      modalCopyBtn.textContent = "Copiado!";
      setTimeout(() => {
        modalCopyBtn.textContent = "Copiar Título";
        modal.style.display = "none";
      }, 1200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = currentTitle;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      modalCopyBtn.textContent = "Copiado!";
      setTimeout(() => {
        modalCopyBtn.textContent = "Copiar Título";
        modal.style.display = "none";
      }, 1200);
    }
  });
}

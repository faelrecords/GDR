(() => {
  const statusEl = document.querySelector('#editor-status');
  const warningEl = document.querySelector('#editor-warning');
  const fontUrl = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;500;600;700;800&family=Poppins:wght@600;700;800;900&display=swap';

  const setStatus = (message) => {
    statusEl.textContent = message;
  };

  const showWarning = (message) => {
    warningEl.textContent = message;
    warningEl.hidden = false;
  };

  const downloadText = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const buildDocument = (body, stylesheet = 'styles.css') => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="A GDR encontra os vazamentos do seu negócio e organiza finanças, processos e time para gerar mais lucro em menos tempo.">
  <meta name="theme-color" content="#b9000c">
  <title>GDR | Mais lucro em menos tempo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontUrl}" rel="stylesheet">
  <link rel="stylesheet" href="${stylesheet}">
  <script src="script.js" defer><\/script>
</head>
<body>
${body}
</body>
</html>`;

  const registerBlocks = (editor) => {
    const blocks = editor.Blocks;
    blocks.add('gdr-section', {
      label: 'Seção',
      category: 'Estrutura',
      content: '<section class="section section-light"><div class="container"><span class="eyebrow">Nova seção</span><h2>Título da seção</h2><p>Escreva aqui o conteúdo.</p></div></section>',
    });
    blocks.add('gdr-two-columns', {
      label: '2 colunas',
      category: 'Estrutura',
      content: '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px"><div><h3>Coluna um</h3><p>Conteúdo.</p></div><div><h3>Coluna dois</h3><p>Conteúdo.</p></div></div>',
    });
    blocks.add('gdr-heading', {
      label: 'Título',
      category: 'Conteúdo',
      content: '<h2>Novo título</h2>',
    });
    blocks.add('gdr-text', {
      label: 'Texto',
      category: 'Conteúdo',
      content: '<p>Digite seu texto aqui.</p>',
    });
    blocks.add('gdr-image', {
      label: 'Imagem',
      category: 'Conteúdo',
      activate: true,
      content: { type: 'image' },
    });
    blocks.add('gdr-button', {
      label: 'Botão',
      category: 'Conteúdo',
      content: '<a class="button button-red" href="#diagnostico">Texto do botão</a>',
    });
    blocks.add('gdr-divider', {
      label: 'Divisor',
      category: 'Conteúdo',
      content: '<div style="height:1px;background:#d2d2d5;margin:32px 0"></div>',
    });
  };

  const bindUi = (editor, sourceCss) => {
    const getMergedCss = () => {
      const editorCss = editor.getCss().trim();
      return editorCss ? `${sourceCss.trim()}\n\n/* Ajustes feitos no GrapesJS */\n${editorCss}\n` : sourceCss;
    };

    document.querySelectorAll('[data-device]').forEach((button) => {
      button.addEventListener('click', () => {
        editor.setDevice(button.dataset.device);
        document.querySelectorAll('[data-device]').forEach((item) => item.classList.toggle('active', item === button));
      });
    });
    document.querySelector('[data-device="Desktop"]').classList.add('active');

    document.querySelector('[data-action="blocks"]').addEventListener('click', () => editor.runCommand('open-blocks'));
    document.querySelector('[data-action="styles"]').addEventListener('click', () => editor.runCommand('open-sm'));
    document.querySelector('[data-action="undo"]').addEventListener('click', () => editor.runCommand('core:undo'));
    document.querySelector('[data-action="redo"]').addEventListener('click', () => editor.runCommand('core:redo'));
    document.querySelector('[data-action="preview"]').addEventListener('click', () => editor.runCommand('preview'));

    document.querySelector('[data-action="download"]').addEventListener('click', () => {
      const cssName = 'styles-editados.css';
      downloadText('index-editado.html', buildDocument(editor.getHtml(), cssName), 'text/html;charset=utf-8');
      window.setTimeout(() => downloadText(cssName, getMergedCss(), 'text/css;charset=utf-8'), 250);
      setStatus('Cópia baixada');
    });

    document.querySelector('[data-action="save-files"]').addEventListener('click', async () => {
      if (!window.showDirectoryPicker) {
        showWarning('Seu navegador não permite salvar diretamente na pasta. Use “Baixar cópia” ou abra o editor no Chrome/Edge.');
        return;
      }

      try {
        const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
        const htmlHandle = await directory.getFileHandle('index.html', { create: true });
        const cssHandle = await directory.getFileHandle('styles.css', { create: true });
        const htmlWriter = await htmlHandle.createWritable();
        await htmlWriter.write(buildDocument(editor.getHtml()));
        await htmlWriter.close();
        const cssWriter = await cssHandle.createWritable();
        await cssWriter.write(getMergedCss());
        await cssWriter.close();
        await editor.store();
        setStatus('Arquivos salvos');
      } catch (error) {
        if (error.name !== 'AbortError') {
          showWarning('Não foi possível salvar os arquivos. Use “Baixar cópia” para exportar sem sobrescrever o projeto.');
        }
      }
    });

    editor.on('storage:start', () => setStatus('Salvando…'));
    editor.on('storage:end', () => setStatus('Salvo no navegador'));
    editor.on('storage:error', () => setStatus('Erro ao salvar'));
    editor.on('update', () => setStatus('Alterações pendentes'));
    editor.on('load', () => {
      const frame = editor.Canvas.getFrameEl();
      const frameDocument = frame?.contentDocument;
      frameDocument?.addEventListener('click', (event) => {
        if (event.target.closest('a, button, input, select, textarea, summary')) event.preventDefault();
      });
      setStatus('Pronto para editar');
    });
  };

  const start = async () => {
    if (window.location.protocol === 'file:') {
      showWarning('Abra este editor pelo servidor local. No terminal da pasta, execute “npm run editor”.');
      setStatus('Servidor necessário');
      return;
    }

    try {
      const [htmlResponse, cssResponse] = await Promise.all([
        fetch('index.html', { cache: 'no-store' }),
        fetch('styles.css', { cache: 'no-store' }),
      ]);
      if (!htmlResponse.ok || !cssResponse.ok) throw new Error('Source unavailable');

      const sourceDocument = new DOMParser().parseFromString(await htmlResponse.text(), 'text/html');
      const sourceCss = await cssResponse.text();
      const stylesheetUrl = new URL('styles.css', window.location.href).href;

      const editor = grapesjs.init({
        container: '#gjs',
        fromElement: false,
        height: 'calc(100vh - 58px)',
        width: 'auto',
        components: sourceDocument.body.innerHTML,
        style: '',
        selectorManager: { componentFirst: true },
        storageManager: {
          type: 'local',
          autosave: true,
          autoload: true,
          stepsBeforeSave: 4,
          options: { local: { key: 'gjsProject-gdr-site-v10' } },
        },
        canvas: {
          styles: [fontUrl, stylesheetUrl],
          scripts: ['script.js'],
        },
        assetManager: {
          upload: false,
          assets: [
            'assets/hero-consultores-gdr-crop.webp',
            'assets/apresentacao-equipe-gdr.webp',
            'assets/consultores-gdr-editorial-v2.webp',
            'assets/gdr-r-original.png',
            'assets/gdr-r-red.png',
            'assets/equipe-gdr.webp',
            'assets/metodo-gdr.webp',
            'assets/cliente-joaozinho.webp',
            'assets/cliente-sabor-di-casa.webp',
            'assets/cliente-fatima-calcados.webp',
            'assets/cliente-arcos-agro.webp',
            'assets/logo-loja-sao-jose.webp',
            'assets/logo-r2-motos.webp',
            'assets/logo-jp-distribuidora.webp',
            'assets/logo-lagoacar.webp',
            'assets/logo-sabor-di-casa.webp',
            'assets/logo-arcos-agro.webp',
            'assets/logo-fatima-calcados.webp',
            'assets/logo-mega-camping.webp',
            'assets/gdr-logo.png',
          ],
        },
        deviceManager: {
          devices: [
            { id: 'desktop', name: 'Desktop', width: '' },
            { id: 'tablet', name: 'Tablet', width: '820px', widthMedia: '1020px' },
            { id: 'mobile', name: 'Mobile portrait', width: '375px', widthMedia: '760px' },
          ],
        },
        styleManager: {
          sectors: [
            { name: 'Dimensões', open: false, buildProps: ['width', 'height', 'min-height', 'max-width', 'margin', 'padding'] },
            { name: 'Tipografia', open: true, buildProps: ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'text-align', 'text-transform'] },
            { name: 'Fundo', open: false, buildProps: ['background-color', 'background', 'opacity'] },
            { name: 'Borda e efeitos', open: false, buildProps: ['border', 'border-radius', 'box-shadow'] },
            { name: 'Layout', open: false, buildProps: ['display', 'position', 'top', 'right', 'bottom', 'left', 'flex-direction', 'justify-content', 'align-items', 'gap', 'overflow'] },
          ],
        },
      });

      registerBlocks(editor);
      bindUi(editor, sourceCss);
      window.gdrEditor = editor;
    } catch (error) {
      showWarning('Não foi possível carregar o site no editor. Confirme que ele foi aberto com “npm run editor”.');
      setStatus('Falha ao carregar');
    }
  };

  start();
})();

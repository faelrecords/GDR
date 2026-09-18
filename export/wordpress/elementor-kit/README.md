# Kit Elementor — GDR Consulting

Compatibilidade preparada:
- Elementor 4.2.4
- Elementor Pro 3.34.0
- Containers Flexbox ativos
- Editor V4/Atomic desativado
- Tema Hello Elementor

## Arquivos para importar

1. `GDR-Landing-Page-Elementor.json` — opção visual original corrigida.
2. `GDR-Landing-Page-Elementor-Grafite.json` — opção grafite com degradês entre as seções.
3. `GDR-Obrigado-Elementor.json` — página de agradecimento.

No WordPress, abra **Modelos → Modelos salvos → Importar modelos** e envie o JSON.
Depois, crie uma página com layout **Elementor Canvas** e insira o modelo importado.

## Organização no editor

Cada seção está em um widget HTML independente, nesta ordem:

- 00 — Configuração visual global
- 01 — Cabeçalho
- 02 — Hero
- 03 — Problemas que a GDR resolve
- 04 — Apresentação da GDR
- 05 — Metodologia
- 06 — O que muda quando a GDR entra
- 07 — Cases de sucesso
- 08 — Perguntas frequentes
- 09 — Formulário e CTA
- 10 — Rodapé
- 11 — Interações e animações

Todos os widgets possuem comentários no início do HTML indicando os elementos seguros para edição.

Para substituição manual no Elementor, use os arquivos da pasta vizinha `widgets-html`. Cada arquivo contém exatamente o código que deve ser colado no widget correspondente. Menu, formulário e rodapé já incluem suas correções locais.

## Imagens

Para abrir com fidelidade imediata, o template usa temporariamente:
`https://gdr.vibecodex.pro/assets/`

Uma cópia de todas as imagens está na pasta `assets` deste pacote. Depois de enviá-las à Biblioteca de Mídia, substitua a URL-base nos widgets HTML se quiser eliminar a dependência externa.

## Formulário

No JSON original, o formulário HTML mantém o visual original e envia atualmente para:
`https://gdrconsulting.com.br/obrigado/`

No arquivo **GDR-Landing-Page-Elementor-Grafite.json**, o formulário já foi substituído pelo widget nativo do Elementor/Pro Elements. Ele preserva nome e sobrenome separados, demais campos, consentimento e o redirecionamento para a página de obrigado.

Para conectar o Integrately nessa versão, abra o formulário no Elementor, adicione **Webhook** em **Ações após o envio** e cole a URL fornecida pelo Integrately. O JSON não inclui uma URL fictícia para evitar perda de leads.

## Após importar

1. Elementor → Ferramentas → Regenerar CSS e dados.
2. Limpe o cache do WP Rocket.
3. Confira desktop, tablet e mobile.
4. Não remova os widgets de configuração global e interações.

## Se você importou uma versão anterior

O arquivo `CORRECAO-MENU-RODAPE.css` contém a correção isolada para menu e rodapé ocuparem toda a largura. Cole seu conteúdo no final do widget **00 — Configuração visual global** e limpe o cache. No JSON atual essa correção já está incluída.

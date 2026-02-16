// js/ui.js

export async function loadComponents() {
    // Procura todos os elementos no HTML que tenham o atributo 'data-include'
    const elements = document.querySelectorAll('[data-include]');
    
    const promises = Array.from(elements).map(async (el) => {
        const file = el.getAttribute('data-include');
        try {
            const response = await fetch(file);
            if (response.ok) {
                // Substitui a tag vazia pelo conteúdo real do arquivo HTML
                el.outerHTML = await response.text(); 
            } else {
                console.error(`Erro ao carregar componente: ${file}`);
            }
        } catch (err) {
            console.error(`Falha na requisição do componente: ${file}`, err);
        }
    });

    // Espera todas as telas serem carregadas antes de liberar o app
    await Promise.all(promises);
}
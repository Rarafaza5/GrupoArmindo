document.addEventListener('DOMContentLoaded', () => {
    console.log("Página carregada!");
  
    // Efeito de rolagem suave
    const links = document.querySelectorAll('nav ul li a');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        if(targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  });
  

  function copiarIP() {
    const ipText = document.getElementById("ip-text").innerText;
    navigator.clipboard.writeText(ipText).then(() => {
      alert("Endereço IP copiado: " + ipText);
    });
  }
  
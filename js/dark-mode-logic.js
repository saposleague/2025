document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle-dark-mode");
  const body = document.body;

  // Função para criar SVG com controle total do CSS
  const criarSVG = (path, fill) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 256 256");
    svg.setAttribute("fill", fill);
    // NÃO definir width/height - deixar CSS controlar
    
    const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathElement.setAttribute("d", path);
    
    svg.appendChild(pathElement);
    return svg;
  };

  const sunPath = "M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm8,24a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,64ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z";
  
  const moonPath = "M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33A8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z";

  const atualizarIcone = () => {
    // Limpar conteúdo
    toggleBtn.innerHTML = '';
    
    if (body.classList.contains("dark-mode")) {
      const sunSVG = criarSVG(sunPath, "#fbff0a");
      toggleBtn.appendChild(sunSVG);
    } else {
      const moonSVG = criarSVG(moonPath, "#000000");
      toggleBtn.appendChild(moonSVG);
    }
  };

  const modoSalvo = localStorage.getItem("modo");
  if (modoSalvo === "escuro") {
    body.classList.add("dark-mode");
  }

  atualizarIcone();

  toggleBtn?.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    const novoModo = body.classList.contains("dark-mode") ? "escuro" : "claro";
    localStorage.setItem("modo", novoModo);
    atualizarIcone();
  });
});

const fs = require('fs');
const path = require('path');

const PROJECTS_URL = 'https://inled.es/projects.json';
const README_PATH = path.join(__dirname, '../../README.md');

// hosted.inled.es responde con un 302 a los release assets de GitHub, que
// llegan como application/octet-stream y GitHub Camo (el proxy de imágenes de
// los README) rechaza con "Non-Image content-type returned". /img/ re-sirve la
// imagen inline con su MIME real, así que el README apunta a /img/.
// Se normalizan tanto la raíz a secas como los prefijos /cdn/ y /1/ (los assets
// viven en la release 'assets'); Cloudflare Pages los estáticos puros sí
// funcionan con Camo, pero /1/ resulta servir HTML, así que mejor /img/ siempre.
function logoForReadme(url) {
  return typeof url === 'string'
    ? url.replace(/^https:\/\/hosted\.inled\.es\/(?:cdn\/|1\/)?([^/]+)$/, 'https://hosted.inled.es/img/$1')
    : url;
}

async function fetchProjects() {
  try {
    const response = await fetch(PROJECTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (github-action-bot; jaimegh-portfolio-updater)'
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching projects:', error);
    process.exit(1);
  }
}

function renderProjects(projects) {
  let html = '<table border="0">\n  <tr>\n';

  projects.forEach((project, index) => {
    // 3 cards per row
    if (index > 0 && index % 3 === 0) {
      html += '  </tr>\n  <tr>\n';
    }

    html += `    <td align="center" width="250" valign="top">
      <a href="${project.link}" target="_blank">
        <img src="${logoForReadme(project.logo)}" width="80" alt="${project.name} logo"><br>
        <b>${project.name}</b>
      </a><br>
      <sub>${project.description}</sub>
    </td>\n`;
  });

  // Close the last row with empty cells if needed
  const remaining = (3 - (projects.length % 3)) % 3;
  if (remaining > 0) {
    for (let i = 0; i < remaining; i++) {
      html += '    <td width="250"></td>\n';
    }
  }

  html += '  </tr>\n</table>\n\n';
  return html;
}

async function updateReadme() {
  const projects = await fetchProjects();
  const projectsContent = renderProjects(projects);

  const readmeContent = fs.readFileSync(README_PATH, 'utf8');
  const startTag = '<!-- INLED-START -->';
  const endTag = '<!-- INLED-END -->';
  
  const regex = new RegExp(`${startTag}[\\s\\S]*${endTag}`, 'g');
  const newContent = readmeContent.replace(regex, `${startTag}\n${projectsContent}${endTag}`);

  fs.writeFileSync(README_PATH, newContent);
  console.log('README.md updated successfully maintaining JSON order.');
}

updateReadme();

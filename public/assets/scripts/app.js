const API_URL = "http://localhost:3000/pontos";
const API_USERS_URL = "http://localhost:3000/usuarios";


let container;
let campoPesquisa;
let todosOsPontos = [];


function getUsuarioLogado() {
    const userJson = sessionStorage.getItem('usuarioLogado');
    return userJson ? JSON.parse(userJson) : null;
}

function setUsuarioLogado(usuario) {
    const userToStore = {
        id: usuario.id,
        email: usuario.email,
        favoritos: usuario.favoritos
    };
    sessionStorage.setItem('usuarioLogado', JSON.stringify(userToStore));
}



async function cadastrarUsuario(email, senha) {
    try {
        const responseExistencia = await fetch(`${API_USERS_URL}?email=${email}`);
        const usuariosExistentes = await responseExistencia.json();

        if (usuariosExistentes.length > 0) {
            alert("Erro: Este e-mail já está cadastrado. Tente outro.");
            return false;
        }

        const novoUsuario = {
            email: email,
            senha: senha,
            favoritos: []
        };

        const cadastroResponse = await fetch(API_USERS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoUsuario)
        });

        if (cadastroResponse.ok) {
            alert("Cadastro realizado com sucesso! Você já pode fazer login.");
            return true;
        } else {
            alert("Erro ao cadastrar. Status: " + cadastroResponse.status);
            return false;
        }
    } catch (error) {
        console.error("Erro no processo de cadastro:", error);
        alert("Erro de conexão com o servidor. Verifique o JSON Server.");
        return false;
    }
}

async function fazerLogin(email, senha) {
    const mensagemLogin = document.getElementById('mensagem-login');

    try {
        const response = await fetch(`${API_USERS_URL}?email=${email}&senha=${senha}`);

        if (!response.ok) {
            mensagemLogin.textContent = `Erro ${response.status}: Falha na comunicação com a API.`;
            mensagemLogin.style.color = 'red';
            return;
        }

        const usuarios = await response.json();

        if (usuarios.length === 1) {
            const usuario = usuarios[0];
            setUsuarioLogado(usuario);

            const modalLoginElement = document.getElementById('modalLogin');
            const modalInstance = bootstrap.Modal.getInstance(modalLoginElement);
            if (modalInstance) {
                modalInstance.hide();
            }

            alert("Login realizado com sucesso!");
            window.location.reload();

        } else {
            mensagemLogin.textContent = "Erro: E-mail ou senha incorretos.";
            mensagemLogin.style.color = 'red';
        }
    } catch (error) {
        mensagemLogin.textContent = "Erro de conexão. Verifique se o JSON Server está rodando.";
        mensagemLogin.style.color = 'red';
        console.error("Erro inesperado durante o login:", error);
    }
}

function fazerLogout() {
    sessionStorage.removeItem('usuarioLogado');
    alert("Logout realizado com sucesso.");

    atualizarInterfaceMenu();
    window.location.reload();
}

async function toggleFavorito(usuario, pontoId) {
    let novosFavoritos = [...usuario.favoritos];
    const isFavorito = novosFavoritos.includes(pontoId);

    if (isFavorito) {
        novosFavoritos = novosFavoritos.filter(id => id !== pontoId); 
    } else {
        novosFavoritos.push(pontoId); 
    }

    
    const response = await fetch(`${API_USERS_URL}/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoritos: novosFavoritos })
    });

    if (response.ok) {
        
        usuario.favoritos = novosFavoritos;
        setUsuarioLogado(usuario);

        

        if (window.location.pathname.endsWith('favoritos.html')) {
            
            carregarFavoritos();

        } else if (container && window.location.pathname.endsWith('index.html')) {
            
            const termoAtual = campoPesquisa.value || '';
            const pontosFiltrados = todosOsPontos.filter(ponto => {
                const nome = ponto.nome.toLowerCase();
                const descricao = ponto.descricao.toLowerCase();
                const termo = termoAtual.toLowerCase().trim();
                return nome.includes(termo) || descricao.includes(termo);
            });
            renderizarCards(pontosFiltrados);
        }

    } else {
        alert("Erro ao atualizar favoritos.");
    }
}

async function carregarPontos() {
    try {
        const resposta = await fetch(API_URL);
        if (!resposta.ok) {
            throw new Error(`Erro de rede: ${resposta.status}`);
        }

        const pontos = await resposta.json();
        todosOsPontos = pontos;

        renderizarCards(todosOsPontos);
        adicionarOuvinteDePesquisa();

    } catch (erro) {
        console.error("Não foi possível carregar os dados:", erro);
        if (container) container.innerHTML = `<p class="alert alert-danger">Erro ao carregar os pontos turísticos. Tente novamente mais tarde.</p>`;
    }
}

async function carregarFavoritos() {
    
    const favoritosContainer = document.getElementById("cards-container");
    const mensagemStatus = document.getElementById("mensagem-status");
    const usuario = getUsuarioLogado();

    if (!usuario) {
        if (mensagemStatus) mensagemStatus.textContent = "Você precisa estar logado para ver seus favoritos.";
        if (mensagemStatus) mensagemStatus.style.display = 'block';
        if (favoritosContainer) favoritosContainer.innerHTML = '';
        return;
    }

    const idsFavoritos = usuario.favoritos;

    try {
        const resposta = await fetch(API_URL);
        const todosOsPontos = await resposta.json();

        const pontosFavoritos = todosOsPontos.filter(ponto => {

            return idsFavoritos.includes(Number(ponto.id));
        });

        if (pontosFavoritos.length > 0) {

            renderizarCards(pontosFavoritos);
        } else {
            if (mensagemStatus) mensagemStatus.textContent = "Sua lista de favoritos está vazia. Adicione alguns pontos!";
            if (mensagemStatus) mensagemStatus.style.display = 'block';
        }
    } catch (erro) {
        console.error("Erro ao carregar favoritos:", erro);
        if (mensagemStatus) mensagemStatus.textContent = "Erro ao carregar dados. Verifique a conexão com o JSON Server.";
    }
}


function renderizarCards(pontosParaExibir, targetContainer = container) {
    const usuarioLogado = getUsuarioLogado();
    const favoritos = usuarioLogado ? usuarioLogado.favoritos : [];

    if (targetContainer) targetContainer.innerHTML = "";

    if (pontosParaExibir.length === 0 && targetContainer) {
        if (!window.location.pathname.endsWith('favoritos.html')) {
            targetContainer.innerHTML = `<p class="alert alert-warning">Nenhum ponto turístico encontrado com este termo.</p>`;
        }
        return;
    }

    pontosParaExibir.forEach(ponto => {
        const isFavorito = favoritos.includes(ponto.id);

        const iconeFavorito = isFavorito
            ? `<i class="bi bi-bookmark-heart-fill text-danger"></i>`
            : `<i class="bi bi-bookmark-heart"></i>`;

        const cardClasses = isFavorito ? "col ponto-card favorito" : "col ponto-card";

        const card = document.createElement("div");
        card.classList.add(...cardClasses.split(' '));

        card.innerHTML = `
             <div class="card h-100">
                <img src="${ponto.imagemPrincipal.url}" class="card-img-top" alt=" ">
                <div class="card-body">
                    <h5 class="card-title">${ponto.nome}</h5>
                    <p class="card-text">${ponto.descricao}</p>
                    
                    <button 
                        class="btn btn-sm btn-light favorito-btn" 
                        data-id="${ponto.id}"
                        data-favorito="${isFavorito}"
                    >
                        ${iconeFavorito} 
                    </button>
                    
                    <a href="detalhes.html?id=${ponto.id}" class="btn btn-primary">Saiba mais</a>
                </div>
                <div class="card-footer">
                    <small class="text-muted">fonte img: ${ponto.imagemPrincipal.Fonte}</small>
                </div>
            </div>
        `;
        if (targetContainer) targetContainer.appendChild(card);
    });

    adicionarOuvinteFavoritar();
}

function adicionarOuvinteDePesquisa() {
    if (!campoPesquisa) return;

    campoPesquisa.addEventListener('keyup', () => {
        const termoPesquisado = campoPesquisa.value.toLowerCase().trim();

        const pontosFiltrados = todosOsPontos.filter(ponto => {
            const nome = ponto.nome.toLowerCase();
            const descricao = ponto.descricao.toLowerCase();
            return nome.includes(termoPesquisado) || descricao.includes(termoPesquisado);
        });

        renderizarCards(pontosFiltrados);
    });
}

function adicionarOuvinteFavoritar() {
    document.querySelectorAll('.favorito-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const usuario = getUsuarioLogado();
            if (!usuario) {
                alert("Você precisa fazer login para adicionar/remover favoritos!");
                return;
            }


            const pontoId = parseInt(e.currentTarget.getAttribute('data-id'));

            toggleFavorito(usuario, pontoId);
        });
    });
}

function atualizarInterfaceMenu() {
    const usuario = getUsuarioLogado();
    const menuLoginBloco = document.getElementById('menu-login');
    const menuFavoritos = document.getElementById('menu-favoritos');
    const menuLogoutBloco = document.getElementById('menu-logout');


    const btnAdicionarPonto = document.getElementById('btn-adicionar-ponto');

    if (usuario) {

        if (menuLoginBloco) menuLoginBloco.classList.add('d-none');
        if (menuFavoritos) menuFavoritos.classList.remove('d-none');
        if (menuLogoutBloco) menuLogoutBloco.classList.remove('d-none');


        if (btnAdicionarPonto) btnAdicionarPonto.classList.remove('d-none');

        const logoutButton = menuLogoutBloco.querySelector('button');
        if (logoutButton && !logoutButton.hasAttribute('data-initialized')) {
            logoutButton.addEventListener('click', fazerLogout);
            logoutButton.setAttribute('data-initialized', 'true');
        }
    } else {

        if (menuLoginBloco) menuLoginBloco.classList.remove('d-none');
        if (menuFavoritos) menuFavoritos.classList.add('d-none');
        if (menuLogoutBloco) menuLogoutBloco.classList.add('d-none');


        if (btnAdicionarPonto) btnAdicionarPonto.classList.add('d-none');
    }
}



document.addEventListener('DOMContentLoaded', () => {


    container = document.getElementById("cards-container");
    campoPesquisa = document.getElementById("campo-pesquisa");



    const formCadastro = document.getElementById('form-cadastro');
    const mensagemCadastro = document.getElementById('mensagem-cadastro');

    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email-cadastro').value.trim();
            const senha = document.getElementById('senha-cadastro').value;
            const confirmaSenha = document.getElementById('confirma-senha').value;

            if (senha !== confirmaSenha) {
                mensagemCadastro.textContent = "Erro: As senhas não conferem.";
                mensagemCadastro.style.color = 'red';
                return;
            }
            if (senha.length < 6) {
                mensagemCadastro.textContent = "Erro: A senha deve ter no mínimo 6 caracteres.";
                mensagemCadastro.style.color = 'red';
                return;
            }

            mensagemCadastro.textContent = "Processando...";
            mensagemCadastro.style.color = 'black';

            const sucesso = await cadastrarUsuario(email, senha);

            if (sucesso) {
                const modalCadastroElement = document.getElementById('modalCadastro');
                if (modalCadastroElement) {
                    const modalInstance = bootstrap.Modal.getInstance(modalCadastroElement);
                    if (modalInstance) modalInstance.hide();
                }
                formCadastro.reset();
            } else {
                mensagemCadastro.textContent = "Cadastro falhou. Verifique o console.";
                mensagemCadastro.style.color = 'red';
            }
        });
    }


    const formLogin = document.getElementById('form-login');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const senha = document.getElementById('login-senha').value;

            await fazerLogin(email, senha);
        });
    }


    const formCadastroPonto = document.getElementById('form-cadastro-ponto');
    const mensagemCadastroPonto = document.getElementById('mensagem-cadastro-ponto');

    if (formCadastroPonto) {
        formCadastroPonto.addEventListener('submit', async (e) => {
            e.preventDefault();


            const novoPonto = {
                nome: document.getElementById('nome-ponto').value,
                descricao: document.getElementById('descricao-ponto').value,
                imagemPrincipal: {
                    url: document.getElementById('url-imagem').value,
                    Fonte: document.getElementById('fonte-imagem').value || 'Desconhecida'
                },

                Imagens: [],
                Fonte2: document.getElementById('fonte-imagem').value || 'Desconhecida'
            };

            mensagemCadastroPonto.textContent = "Salvando ponto...";
            mensagemCadastroPonto.style.color = 'black';


            const sucesso = await cadastrarNovoPonto(novoPonto);

            if (sucesso) {
                mensagemCadastroPonto.textContent = "Ponto salvo com sucesso! Recarregando...";


                const modalElement = document.getElementById('modalCadastroPonto');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();

                window.location.reload();
            } else {
                mensagemCadastroPonto.textContent = "Falha ao salvar. Verifique se o JSON Server está ativo.";
                mensagemCadastroPonto.style.color = 'red';
            }
        });
    }



    if (window.location.pathname.endsWith('favoritos.html')) {
        carregarFavoritos();
    } else if (container) {
        carregarPontos();
    }



    atualizarInterfaceMenu();
});



async function cadastrarNovoPonto(dadosDoPonto) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosDoPonto)
        });

        if (response.ok) {
            return true;
        } else {
            console.error("Erro ao cadastrar. Status:", response.status);
            return false;
        }
    } catch (error) {
        console.error("Erro de conexão com o JSON Server:", error);
        return false;
    }
}
//mapa
const centralLatLong = [-44.2, -20.15]; // Brumadinho

mapboxgl.accessToken = 'pk.eyJ1IjoiZ2FicmllbGNydXpkZXYiLCJhIjoiY21pMHVkdGN4MHJuMDJrcTV2M21kZTFlNyJ9.RCZOyIwmC2G_rJCAVsoLcQ';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: centralLatLong,
    zoom: 11
});

// Marcador de Brumadinho
new mapboxgl.Marker({ color: 'red' })
    .setLngLat(centralLatLong)
    .setPopup(new mapboxgl.Popup().setHTML('<h4>Brumadinho - MG</h4>'))
    .addTo(map);

// Coordenadas do Inhotim
const inhotimCoords = [-44.2157, -20.1301];


new mapboxgl.Marker({ element: document.querySelector('.marker-destaque') })
    .setLngLat(inhotimCoords)
    .setPopup(new mapboxgl.Popup().setHTML('<h4>Inhotim</h4>'))
    .addTo(map);

// Coordenadas do memorial de Brumadinho
const memorialCoords = [-44.15388, -20.20447];

new mapboxgl.Marker({ element: document.querySelector('.marker-destaque') })
    .setLngLat(memorialCoords)
    .setPopup(new mapboxgl.Popup().setHTML('<h4>Memorial Brumadinho</h4>'))
    .addTo(map);
// Coordenada da cachoeira das ostras
const cachoeiraCoords = [-44.1985, -20.1623];

new mapboxgl.Marker({ element: document.querySelector('.marker-destaque') })
    .setLngLat(cachoeiraCoords)
    .setPopup(new mapboxgl.Popup().setHTML('<h4>Cachoeira das Ostras</h4>'))
    .addTo(map);

// Coordenadas Igreja Piedade do Paraopeba
const igrejaCoords = [-44.1912, -20.1675];

new mapboxgl.Marker({ element: document.querySelector('.marker-destaque') })
    .setLngLat(igrejaCoords)
    .setPopup(new mapboxgl.Popup().setHTML('<h4>Igreja Piedade do Paraopeba</h4>'))
    .addTo(map);

// Coordenadas Ruinas do Forte
const forteCoords = [-44.1793, -20.1554];


new mapboxgl.Marker({ element: document.querySelector('.marker-destaque') })
    .setLngLat(forteCoords)
    .setPopup(new mapboxgl.Popup().setHTML('<h4>Ruínas do Forte</h4>'))
    .addTo(map);

// Coordenadas Fazenda dos Martins
const fazendaCoords = [-44.2167, -20.1833];

new mapboxgl.Marker({ element: document.querySelector('.marker-destaque') })
    .setLngLat(fazendaCoords)
    .setPopup(new mapboxgl.Popup().setHTML('<h4>Fazenda dos Martins</h4>'))
    .addTo(map);
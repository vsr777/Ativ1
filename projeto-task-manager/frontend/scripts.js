// danger-control.js - Sistema completo do DANGER ZONE

// Configurações globais
const API_BASE_URL_REST = 'http://localhost:3000';
const API_BASE_URL_GRAPHQL = 'http://localhost:4000';

// Estado da aplicação
let currentApiType = 'rest';
let currentSecurityLevel = 1;
let dangerRegistry = [];
let currentDangerIdToDelete = null;

// Elementos do DOM
document.addEventListener('DOMContentLoaded', () => {
  // Referenciar elementos
  const dangerForm = document.getElementById('danger-form');
  const dangersContainer = document.getElementById('dangers-container');
  const securityLevelSelect = document.getElementById('security-level-select');
  const apiTypeRadios = document.querySelectorAll('input[name="api-type"]');
  const filterRiskSelect = document.getElementById('filter-risk');
  const filterCategorySelect = document.getElementById('filter-category');
  const applyFiltersBtn = document.getElementById('apply-filters');
  const confirmModal = document.getElementById('confirm-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete');
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  const alertNotification = document.getElementById('alert-notification');
  const notificationMessage = document.getElementById('notification-message');
  const systemTimeElement = document.getElementById('system-time');
  
  // Contadores estatísticos
  const extremeCountElement = document.getElementById('extreme-count');
  const highCountElement = document.getElementById('high-count');
  const moderateCountElement = document.getElementById('moderate-count');
  const lowCountElement = document.getElementById('low-count');

  // Inicializar o relógio do sistema
  updateSystemTime();
  setInterval(updateSystemTime, 1000);
  
  // Carregar perigos iniciais
  fetchDangers();
  
  // Configurar event listeners
  setupEventListeners();

  // Função para atualizar relógio do sistema
  function updateSystemTime() {
    const now = new Date();
    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    };
    systemTimeElement.textContent = `Data do sistema: ${now.toLocaleDateString('pt-BR', options)}`;
  }

  // Exibir notificação
  function showNotification(message) {
    notificationMessage.textContent = message;
    alertNotification.style.display = 'block';
    
    setTimeout(() => {
      alertNotification.style.display = 'none';
    }, 3000);
  }

  // Configuração de todos os event listeners
  function setupEventListeners() {
    // Alterar nível de segurança
    securityLevelSelect.addEventListener('change', () => {
      currentSecurityLevel = parseInt(securityLevelSelect.value);
      showNotification(`Nível de segurança alterado para: ${currentSecurityLevel}`);
      fetchDangers(); // Recarregar perigos com o novo nível
    });
    
    // Alternar entre REST e GraphQL
    apiTypeRadios.forEach(radio => {
      radio.addEventListener('change', (event) => {
        currentApiType = event.target.value;
        showNotification(`Interface de API alterada para: ${currentApiType.toUpperCase()}`);
        fetchDangers(); // Recarregar perigos com a nova API
      });
    });
    
    // Submeter formulário de novo perigo
    dangerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      createDanger();
    });
    
    // Aplicar filtros
    applyFiltersBtn.addEventListener('click', fetchDangers);
    
    // Manipulação de modal de confirmação
    cancelDeleteBtn.addEventListener('click', () => {
      confirmModal.style.display = 'none';
      currentDangerIdToDelete = null;
    });
    
    confirmDeleteBtn.addEventListener('click', () => {
      if (currentDangerIdToDelete) {
        deleteDanger(currentDangerIdToDelete);
        confirmModal.style.display = 'none';
        currentDangerIdToDelete = null;
      }
    });
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (event) => {
      if (event.target === confirmModal) {
        confirmModal.style.display = 'none';
        currentDangerIdToDelete = null;
      }
    });
  }

  // Buscar perigos com base na API atual e filtros
  async function fetchDangers() {
    try {
      const riskLevel = filterRiskSelect.value;
      const category = filterCategorySelect.value;
      
      let dangers = [];
      
      if (currentApiType === 'rest') {
        // Construir URL com filtros
        let url = `${API_BASE_URL_REST}/dangers`;
        const params = [];
        
        if (riskLevel) {
          params.push(`riskLevel=${riskLevel}`);
        }
        
        if (category) {
          params.push(`category=${category}`);
        }
        
        if (params.length > 0) {
          url += `?${params.join('&')}`;
        }
        
        // Fazer requisição REST
        const response = await fetch(url, {
          headers: {
            'Security-Clearance': currentSecurityLevel.toString()
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erro de API: ${response.status}`);
        }
        
        const data = await response.json();
        dangers = data.data || [];
        
      } else {
        // Construir query GraphQL com filtros
        let query = '';
        let variables = {};
        
        if (riskLevel && category) {
          query = `
            query GetFilteredDangers($category: DangerCategory!, $riskLevel: RiskLevel!) {
              dangersByCategory(category: $category) {
                id
                title
                description
                riskLevel
                category
                location
                consequenceRating
                dateReported
                lastInspection
                reportedBy
                status
              }
            }
          `;
          variables = {
            category: category,
            riskLevel: riskLevel
          };
        } else if (riskLevel) {
          query = `
            query GetDangersByRiskLevel($level: RiskLevel!) {
              dangersByRiskLevel(level: $level) {
                id
                title
                description
                riskLevel
                category
                location
                consequenceRating
                dateReported
                lastInspection
                reportedBy
                status
              }
            }
          `;
          variables = {
            level: riskLevel
          };
        } else if (category) {
          query = `
            query GetDangersByCategory($category: DangerCategory!) {
              dangersByCategory(category: $category) {
                id
                title
                description
                riskLevel
                category
                location
                consequenceRating
                dateReported
                lastInspection
                reportedBy
                status
              }
            }
          `;
          variables = {
            category: category
          };
        } else {
          query = `
            query {
              dangers {
                id
                title
                description
                riskLevel
                category
                location
                consequenceRating
                dateReported
                lastInspection
                reportedBy
                status
              }
            }
          `;
        }
        
        // Fazer requisição GraphQL
        const response = await fetch(API_BASE_URL_GRAPHQL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `SecurityLevel ${currentSecurityLevel}`
          },
          body: JSON.stringify({ 
            query,
            variables
          })
        });
        
        const result = await response.json();
        
        if (result.errors) {
          throw new Error(result.errors[0].message);
        }
        
        // Determinar qual propriedade contém os dados
        if (result.data.dangers) {
          dangers = result.data.dangers;
        } else if (result.data.dangersByRiskLevel) {
          dangers = result.data.dangersByRiskLevel;
        } else if (result.data.dangersByCategory) {
          dangers = result.data.dangersByCategory;
        }
        
        // Filtrar manualmente se necessário
        if (riskLevel && category && result.data.dangersByCategory) {
          dangers = result.data.dangersByCategory.filter(d => d.riskLevel === riskLevel);
        }
      }
      
      // Atualizar o registro local
      dangerRegistry = dangers;
      
      // Renderizar os perigos na interface
      renderDangers();
      
      // Atualizar contadores
      updateStatCounters();
      
    } catch (error) {
      console.error('Erro ao buscar perigos:', error);
      showNotification(`⚠️ ERRO: ${error.message}`);
      
      // Limpar o registro em caso de erro
      dangerRegistry = [];
      renderDangers();
    }
  }

  // Criar um novo perigo
  async function createDanger() {
    try {
      const title = document.getElementById('title').value;
      const description = document.getElementById('description').value;
      const riskLevel = document.getElementById('risk-level').value;
      const category = document.getElementById('category').value;
      const location = document.getElementById('location').value;
      const consequenceRating = parseInt(document.getElementById('consequence').value);
      
      // Validações específicas para perigos extremos
      if (riskLevel === 'extreme' && currentSecurityLevel < 3) {
        showNotification('🚫 ACESSO NEGADO: Nível de segurança 3+ necessário para registrar perigos extremos');
        return;
      }
      
      if (riskLevel === 'extreme' && consequenceRating < 7) {
        showNotification('⚠️ ERRO DE VALIDAÇÃO: Perigos extremos devem ter classificação de consequência 7-10');
        return;
      }
      
      if (currentApiType === 'rest') {
        // Requisição REST
        const response = await fetch(`${API_BASE_URL_REST}/dangers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Security-Clearance': currentSecurityLevel.toString()
          },
          body: JSON.stringify({
            title,
            description,
            riskLevel,
            category,
            location,
            consequenceRating
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        showNotification(`✅ PERIGO REGISTRADO: ${data.data.title}`);
        
      } else {
        // Requisição GraphQL
        const mutation = `
          mutation CreateDanger(
            $title: String!,
            $description: String,
            $riskLevel: RiskLevel!,
            $category: DangerCategory!,
            $location: String!,
            $consequenceRating: Int!
          ) {
            createDanger(
              title: $title,
              description: $description,
              riskLevel: $riskLevel,
              category: $category,
              location: $location,
              consequenceRating: $consequenceRating
            ) {
              id
              title
            }
          }
        `;
        
        const variables = {
          title,
          description: description || "",
          riskLevel,
          category,
          location,
          consequenceRating
        };
        
        const response = await fetch(API_BASE_URL_GRAPHQL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `SecurityLevel ${currentSecurityLevel}`
          },
          body: JSON.stringify({ 
            query: mutation,
            variables
          })
        });
        
        const result = await response.json();
        
        if (result.errors) {
          throw new Error(result.errors[0].message);
        }
        
        showNotification(`✅ PERIGO REGISTRADO: ${result.data.createDanger.title}`);
      }
      
      // Limpar formulário
      dangerForm.reset();
      
      // Recarregar lista de perigos
      fetchDangers();
      
    } catch (error) {
      console.error('Erro ao criar perigo:', error);
      showNotification(`⚠️ ERRO AO REGISTRAR: ${error.message}`);
    }
  }

  // Remover um perigo
  async function deleteDanger(id) {
    try {
      // Verificar nível de segurança
      if (currentSecurityLevel < 4) {
        showNotification('🚫 ACESSO NEGADO: Nível de segurança 4+ necessário para remover perigos');
        return;
      }
      
      if (currentApiType === 'rest') {
        // Requisição REST
        const response = await fetch(`${API_BASE_URL_REST}/dangers/${id}`, {
          method: 'DELETE',
          headers: {
            'Security-Clearance': currentSecurityLevel.toString()
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
        }
        
        showNotification('✅ PERIGO REMOVIDO DO SISTEMA');
        
      } else {
        // Requisição GraphQL
        const mutation = `
          mutation DeleteDanger($id: ID!) {
            deleteDanger(id: $id)
          }
        `;
        
        const response = await fetch(API_BASE_URL_GRAPHQL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `SecurityLevel ${currentSecurityLevel}`
          },
          body: JSON.stringify({ 
            query: mutation,
            variables: { id }
          })
        });
        
        const result = await response.json();
        
        if (result.errors) {
          throw new Error(result.errors[0].message);
        }
        
        if (!result.data.deleteDanger) {
          throw new Error('Falha ao remover perigo');
        }
        
        showNotification('✅ PERIGO REMOVIDO DO SISTEMA');
      }
      
      // Recarregar lista de perigos
      fetchDangers();
      
    } catch (error) {
      console.error('Erro ao remover perigo:', error);
      showNotification(`⚠️ ERRO AO REMOVER: ${error.message}`);
    }
  }

  // Confirmar exclusão de perigo
  function confirmDeletion(id) {
    currentDangerIdToDelete = id;
    confirmModal.style.display = 'block';
  }

  // Renderizar perigos na interface
  function renderDangers() {
    // Limpar contêiner
    dangersContainer.innerHTML = '';
    
    // Verificar se há perigos
    if (dangerRegistry.length === 0) {
      dangersContainer.innerHTML = `
        <div class="no-dangers-message">
          <i class="fas fa-check-circle"></i>
          NENHUM PERIGO REGISTRADO NO SISTEMA
          <i class="fas fa-check-circle"></i>
        </div>
      `;
      return;
    }
    
    // Renderizar cada perigo
    dangerRegistry.forEach(danger => {
      // Criar card de perigo
      const dangerCard = document.createElement('div');
      dangerCard.className = `danger-card ${danger.riskLevel}`;
      
      // Formatar datas
      const reportedDate = new Date(danger.dateReported).toLocaleDateString('pt-BR');
      const inspectionDate = new Date(danger.lastInspection).toLocaleDateString('pt-BR');
      
      // Definir texto para o nível de risco
      let riskText;
      switch(danger.riskLevel) {
        case 'extreme': riskText = 'EXTREMO'; break;
        case 'high': riskText = 'ALTO'; break;
        case 'moderate': riskText = 'MODERADO'; break;
        case 'low': riskText = 'BAIXO'; break;
        default: riskText = danger.riskLevel;
      }
      
      // Definir texto para a categoria
      let categoryText;
      switch(danger.category) {
        case 'chemical': categoryText = 'QUÍMICO'; break;
        case 'electrical': categoryText = 'ELÉTRICO'; break;
        case 'mechanical': categoryText = 'MECÂNICO'; break;
        case 'biological': categoryText = 'BIOLÓGICO'; break;
        case 'radiation': categoryText = 'RADIAÇÃO'; break;
        default: categoryText = danger.category;
      }
      
      // Definir ícone para a categoria
      let categoryIcon;
      switch(danger.category) {
        case 'chemical': categoryIcon = 'fas fa-flask'; break;
        case 'electrical': categoryIcon = 'fas fa-bolt'; break;
        case 'mechanical': categoryIcon = 'fas fa-cogs'; break;
        case 'biological': categoryIcon = 'fas fa-biohazard'; break;
        case 'radiation': categoryIcon = 'fas fa-radiation'; break;
        default: categoryIcon = 'fas fa-exclamation-triangle';
      }
      
      // Construir HTML do card
      dangerCard.innerHTML = `
        <h3 class="danger-title">
          <i class="${categoryIcon}"></i>
          ${danger.title}
        </h3>
        <div class="danger-badge badge-${danger.riskLevel}">${riskText}</div>
        <p class="danger-description">${danger.description || 'Sem descrição detalhada disponível.'}</p>
        <div class="danger-meta">
          <span class="meta-item"><i class="fas fa-map-marker-alt"></i> ${danger.location}</span>
          <span class="meta-item"><i class="${categoryIcon}"></i> ${categoryText}</span>
          <span class="meta-item"><i class="fas fa-exclamation-circle"></i> Severidade: ${danger.consequenceRating}/10</span>
          <span class="meta-item"><i class="fas fa-calendar-day"></i> Registrado: ${reportedDate}</span>
          <span class="meta-item"><i class="fas fa-clipboard-check"></i> Última inspeção: ${inspectionDate}</span>
        </div>
        <div class="danger-actions">
          <button class="delete-btn" data-id="${danger.id}">
            <i class="fas fa-trash-alt"></i> REMOVER REGISTRO
          </button>
        </div>
      `;
      
      // Adicionar ao container
      dangersContainer.appendChild(dangerCard);
      
      // Adicionar evento de exclusão
      const deleteBtn = dangerCard.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => {
        confirmDeletion(danger.id);
      });
    });
  }

  // Atualizar contadores de estatísticas
  function updateStatCounters() {
    // Contar por nível de risco
    const extremeCount = dangerRegistry.filter(d => d.riskLevel === 'extreme').length;
    const highCount = dangerRegistry.filter(d => d.riskLevel === 'high').length;
    const moderateCount = dangerRegistry.filter(d => d.riskLevel === 'moderate').length;
    const lowCount = dangerRegistry.filter(d => d.riskLevel === 'low').length;
    
    // Atualizar elementos
    extremeCountElement.textContent = extremeCount;
    highCountElement.textContent = highCount;
    moderateCountElement.textContent = moderateCount;
    lowCountElement.textContent = lowCount;
    
    // Adicionar animação pulsante se houver perigos extremos
    if (extremeCount > 0) {
      extremeCountElement.parentElement.classList.add('pulsing');
    } else {
      extremeCountElement.parentElement.classList.remove('pulsing');
    }
  }
});
class PhotoBoothSystem {
    constructor() {
        this.socket = null;
        this.sessionId = this.generateSessionId();
        this.photos = [];
        this.viewerBaseUrl = window.location.origin;
        this.mobileConnected = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectWebSocket();
        this.generateMobileQR();
        this.displayInstructions();
    }

    initializeElements() {
        // Elementos do controle PC
        this.sessionDisplay = document.getElementById('session-display');
        this.connectionStatus = document.getElementById('connection-status');
        this.photoCount = document.getElementById('photo-count');
        this.mobileStatus = document.getElementById('mobile-status');
        this.generateQrBtn = document.getElementById('generate-qr-btn');
        this.resetSessionBtn = document.getElementById('reset-session-btn');
        this.newSessionBtn = document.getElementById('new-session-btn');
        this.qrSection = document.getElementById('qr-section');
        this.qrCodeElement = document.getElementById('qr-code');
        this.viewerUrlElement = document.getElementById('viewer-url');
        this.viewerUrlDisplay = document.getElementById('viewer-url-display');
        this.photosGrid = document.getElementById('photos-grid');
        this.galleryCount = document.getElementById('gallery-count');
        
        // Elementos do visualizador
        this.viewerLoading = document.getElementById('viewer-loading');
        this.viewerEmptyState = document.getElementById('viewer-empty-state');
        this.viewerPhotosGrid = document.getElementById('viewer-photos-grid');
        
        // Modal
        this.photoModal = document.getElementById('photo-modal');
        this.modalImage = document.getElementById('modal-image');
        this.modalClose = document.getElementById('modal-close');
        
        // QR Codes de acesso
        this.mobileQrElement = document.getElementById('mobile-qr');
    }

    setupEventListeners() {
        this.generateQrBtn.addEventListener('click', () => this.generateViewerQRCode());
        this.resetSessionBtn.addEventListener('click', () => this.resetSession());
        this.newSessionBtn.addEventListener('click', () => this.newSession());
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.photoModal.addEventListener('click', (e) => {
            if (e.target === this.photoModal) this.closeModal();
        });
    }

    generateSessionId() {
        return 'sessao_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    displayInstructions() {
        const instructions = `
            <div class="instructions">
                <h3>📋 Instruções de Uso - Início do Dia</h3>
                <ol>
                    <li><strong>Gerar QR Code</strong> - O QR Code acima é para o celular da cabine</li>
                    <li><strong>Escaneie no celular</strong> - Use a câmera do celular da cabine para escanear</li>
                    <li><strong>Toque na tela</strong> - No celular, toque na tela para iniciar as fotos</li>
                    <li><strong>Gerar Visualizador</strong> - Após as fotos, gere QR Code do visualizador</li>
                </ol>
            </div>
        `;
        document.querySelector('.access-card').insertAdjacentHTML('beforeend', instructions);
    }

    generateMobileQR() {
        this.sessionDisplay.textContent = this.sessionId;
        
        // Gerar URL para o mobile com session ID
        const mobileUrl = `${window.location.origin}/mobile.html?session=${this.sessionId}`;
        
        // Gerar QR Code grande para fácil escaneamento
        QRCode.toCanvas(this.mobileQrElement, mobileUrl, { 
            width: 280, 
            height: 280,
            margin: 2
        }, (error) => {
            if (error) {
                console.error('Erro ao gerar QR Code mobile:', error);
                this.mobileQrElement.innerHTML = '<p>Erro ao gerar QR Code</p>';
            } else {
                console.log('QR Code mobile gerado com sucesso');
            }
        });

        // Também mostrar a URL para copiar se necessário
        this.viewerUrlDisplay.textContent = mobileUrl;
    }

    newSession() {
        // Gerar nova sessão
        this.sessionId = this.generateSessionId();
        this.clearPhotos();
        this.mobileConnected = false;
        this.updateMobileStatus();
        this.generateMobileQR();
        this.qrSection.style.display = 'none';
        
        // Reconectar WebSocket com nova sessão
        if (this.socket) {
            this.socket.emit('join-session', this.sessionId);
        }
        
        alert(`Nova sessão criada: ${this.sessionId}\n\nEscaneie o novo QR Code no celular da cabine.`);
    }

    connectWebSocket() {
        const backendUrl = 'https://seu-backend.render.com'; // ATUALIZAR COM SUA URL
        this.socket = io(backendUrl);
        
        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
            this.connectionStatus.textContent = '● Online';
            this.connectionStatus.className = 'status-online';
            this.socket.emit('join-session', this.sessionId);
        });
        
        this.socket.on('disconnect', () => {
            this.connectionStatus.textContent = '● Offline';
            this.connectionStatus.className = 'status-offline';
        });
        
        this.socket.on('new-photo', (photo) => {
            this.addPhoto(photo);
            this.updateViewerPhotos();
            this.mobileConnected = true;
            this.updateMobileStatus();
        });
        
        this.socket.on('mobile-connected', () => {
            this.mobileConnected = true;
            this.updateMobileStatus();
        });
        
        this.socket.on('session-reset', () => {
            this.clearPhotos();
            this.updateViewerPhotos();
        });
    }

    updateMobileStatus() {
        if (this.mobileConnected) {
            this.mobileStatus.textContent = '📱 Celular: Conectado';
            this.mobileStatus.className = 'mobile-connected';
        } else {
            this.mobileStatus.textContent = '📱 Celular: Não conectado';
            this.mobileStatus.className = 'mobile-disconnected';
        }
    }

    addPhoto(photo) {
        this.photos.push(photo);
        this.renderPhoto(photo);
        this.updateGalleryCount();
        this.photoCount.textContent = `Fotos: ${this.photos.length}`;
    }

    renderPhoto(photo) {
        const emptyGallery = this.photosGrid.querySelector('.empty-gallery');
        if (emptyGallery) {
            emptyGallery.remove();
        }

        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photo.data}" alt="Foto ${this.photos.length}">
            <div class="photo-actions">
                <button class="photo-btn zoom-btn" onclick="photoBoothSystem.zoomPhoto('${photo.id}')">🔍</button>
                <button class="photo-btn delete-btn" onclick="photoBoothSystem.deletePhoto('${photo.id}')">X</button>
            </div>
        `;
        
        this.photosGrid.appendChild(photoItem);
    }

    zoomPhoto(photoId) {
        const photo = this.photos.find(p => p.id === photoId);
        if (photo) {
            this.modalImage.src = photo.data;
            this.photoModal.style.display = 'flex';
        }
    }

    closeModal() {
        this.photoModal.style.display = 'none';
    }

    deletePhoto(photoId) {
        this.photos = this.photos.filter(p => p.id !== photoId);
        this.renderGallery();
        this.updateViewerPhotos();
        this.updateGalleryCount();
        this.photoCount.textContent = `Fotos: ${this.photos.length}`;
    }

    renderGallery() {
        this.photosGrid.innerHTML = '';
        
        if (this.photos.length === 0) {
            this.photosGrid.innerHTML = `
                <div class="empty-gallery">
                    <p>Nenhuma foto capturada ainda</p>
                    <p>⏳ Aguardando o celular conectar e iniciar...</p>
                </div>
            `;
            return;
        }
        
        this.photos.forEach(photo => this.renderPhoto(photo));
    }

    updateGalleryCount() {
        this.galleryCount.textContent = `(${this.photos.length})`;
    }

    updateViewerPhotos() {
        if (document.getElementById('viewer').classList.contains('active')) {
            this.renderViewerPhotos();
        }
    }

    renderViewerPhotos() {
        this.viewerPhotosGrid.innerHTML = '';
        
        if (this.photos.length === 0) {
            this.viewerLoading.style.display = 'none';
            this.viewerEmptyState.style.display = 'block';
            return;
        }

        this.viewerLoading.style.display = 'none';
        this.viewerEmptyState.style.display = 'none';
        
        this.photos.forEach((photo, index) => {
            const photoItem = document.createElement('div');
            photoItem.className = 'viewer-photo-item';
            photoItem.innerHTML = `
                <img src="${photo.data}" alt="Foto ${index + 1}">
                <button class="download-btn" onclick="photoBoothSystem.downloadPhoto('${photo.id}', ${index + 1})">⬇️</button>
            `;
            this.viewerPhotosGrid.appendChild(photoItem);
        });
    }

    downloadPhoto(photoId, photoNumber) {
        const photo = this.photos.find(p => p.id === photoId);
        if (photo) {
            const link = document.createElement('a');
            link.href = photo.data;
            link.download = `foto-cabine-${photoNumber}.jpg`;
            link.click();
        }
    }

    clearPhotos() {
        this.photos = [];
        this.renderGallery();
        this.updateGalleryCount();
        this.photoCount.textContent = 'Fotos: 0';
    }

    async generateViewerQRCode() {
        if (this.photos.length === 0) {
            alert('Nenhuma foto capturada ainda! Aguarde o celular tirar as fotos.');
            return;
        }

        this.generateQrBtn.disabled = true;
        this.generateQrBtn.textContent = '⏳ Gerando...';

        try {
            // Upload para IMGBB
            const uploadedUrls = await this.uploadToIMGBB();
            
            // Gerar URL do visualizador com as fotos
            const viewerUrl = `${window.location.origin}/viewer.html?photos=${encodeURIComponent(JSON.stringify(uploadedUrls))}`;
            
            // Gerar QR Code para exibição
            this.qrCodeElement.innerHTML = '';
            QRCode.toCanvas(this.qrCodeElement, viewerUrl, {
                width: 280,
                height: 280,
                margin: 2
            }, (error) => {
                if (error) {
                    console.error('Erro ao gerar QR Code:', error);
                    alert('Erro ao gerar QR Code');
                    return;
                }
                
                this.qrSection.style.display = 'block';
                this.viewerUrlElement.textContent = viewerUrl;
                this.generateQrBtn.textContent = '✅ QR Code Gerado!';
                
                // Scroll para o QR Code
                this.qrSection.scrollIntoView({ behavior: 'smooth' });
                
                setTimeout(() => {
                    this.generateQrBtn.disabled = false;
                    this.generateQrBtn.textContent = '📱 Gerar QR Code do Visualizador';
                }, 3000);
            });
            
        } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
            alert('Erro ao gerar QR Code. Tente novamente.');
            this.generateQrBtn.disabled = false;
            this.generateQrBtn.textContent = '📱 Gerar QR Code do Visualizador';
        }
    }

    async uploadToIMGBB() {
        const uploadedUrls = [];
        const apiKey = 'sua_chave_api_imgbb'; // SUBSTITUIR PELA SUA CHAVE
        
        for (const [index, photo] of this.photos.entries()) {
            try {
                console.log(`Enviando foto ${index + 1}/${this.photos.length}...`);
                
                // Converter base64 para blob
                const response = await fetch(photo.data);
                const blob = await response.blob();
                
                // Criar form data para upload
                const formData = new FormData();
                formData.append('image', blob.split(',')[1]); // Remover header base64
                formData.append('key', apiKey);
                
                // Fazer upload para IMGBB
                const uploadResponse = await fetch('https://api.imgbb.com/1/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await uploadResponse.json();
                
                if (result.success) {
                    uploadedUrls.push(result.data.url);
                    console.log(`✅ Foto ${index + 1} enviada: ${result.data.url}`);
                } else {
                    console.error('❌ Erro no upload:', result);
                    throw new Error(result.error?.message || 'Erro no upload');
                }
                
            } catch (error) {
                console.error(`❌ Erro ao enviar foto ${index + 1}:`, error);
                throw error;
            }
        }
        
        return uploadedUrls;
    }

    resetSession() {
        if (this.socket) {
            this.socket.emit('reset-session', this.sessionId);
        }
        this.clearPhotos();
        this.qrSection.style.display = 'none';
        this.mobileConnected = false;
        this.updateMobileStatus();
        alert('Sessão finalizada. O celular voltará para o vídeo inicial.\n\nPara nova sessão, use o botão "Nova Sessão".');
    }
}

// Função para alternar entre abas
function openTab(tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    const tabs = document.getElementsByClassName('tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if (tabName === 'viewer') {
        photoBoothSystem.renderViewerPhotos();
    }
}

// Inicializar sistema
let photoBoothSystem;
document.addEventListener('DOMContentLoaded', () => {
    photoBoothSystem = new PhotoBoothSystem();
    window.photoBoothSystem = photoBoothSystem;
});

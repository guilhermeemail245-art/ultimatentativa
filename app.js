class PhotoBoothSystem {
    constructor() {
        this.socket = null;
        this.sessionId = this.generateSessionId();
        this.photos = [];
        this.viewerBaseUrl = window.location.origin;
        this.mobileConnected = false;
        this.backendUrl = 'https://rendercerto-s7w2.onrender.com';
        this.imgbbApiKey = '6734e028b20f88d5795128d242f85582';
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectWebSocket();
        this.displaySessionInfo();
    }

    initializeElements() {
        // Elementos do controle PC
        this.sessionDisplay = document.getElementById('session-display');
        this.connectionStatus = document.getElementById('connection-status');
        this.photoCount = document.getElementById('photo-count');
        this.mobileStatus = document.getElementById('mobile-status');
        this.generateQrBtn = document.getElementById('generate-qr-btn');
        this.generateMobileQrBtn = document.getElementById('generate-mobile-qr-btn');
        this.resetSessionBtn = document.getElementById('reset-session-btn');
        this.newSessionBtn = document.getElementById('new-session-btn');
        this.qrCanvas = document.getElementById('qr-code');
        this.mobileQrCanvas = document.getElementById('mobile-qr-code');
    }

    setupEventListeners() {
        if (this.generateQrBtn) {
            this.generateQrBtn.addEventListener('click', () => {
                const url = `${this.viewerBaseUrl}/viewer.html?session=${this.sessionId}`;
                QRCode.toCanvas(this.qrCanvas, url, function (error) {
                    if (error) console.error(error);
                    console.log('QR Code do PC gerado!');
                });
            });
        }

        if (this.generateMobileQrBtn) {
            this.generateMobileQrBtn.addEventListener('click', () => {
                const mobileUrl = `${this.viewerBaseUrl}/mobile.html?session=${this.sessionId}`;
                if (this.mobileQrCanvas) {
                    QRCode.toCanvas(this.mobileQrCanvas, mobileUrl, function (error) {
                        if (error) console.error(error);
                        console.log('QR Code do celular gerado!');
                    });
                } else {
                    console.error("Elemento #mobile-qr-code não encontrado no HTML");
                }
            });
        }

        if (this.resetSessionBtn) {
            this.resetSessionBtn.addEventListener('click', () => {
                this.photos = [];
                this.displaySessionInfo();
                console.log("Sessão resetada!");
            });
        }

        if (this.newSessionBtn) {
            this.newSessionBtn.addEventListener('click', () => {
                this.sessionId = this.generateSessionId();
                this.photos = [];
                this.displaySessionInfo();
                console.log("Nova sessão iniciada!");
            });
        }
    }

    connectWebSocket() {
        try {
            this.socket = new WebSocket(`wss://${window.location.host}`);
            this.socket.onopen = () => {
                console.log("Conectado ao WebSocket");
                if (this.connectionStatus) this.connectionStatus.textContent = "Conectado";
            };
            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log("Mensagem recebida:", data);
            };
            this.socket.onclose = () => {
                console.log("WebSocket desconectado");
                if (this.connectionStatus) this.connectionStatus.textContent = "Desconectado";
            };
        } catch (e) {
            console.error("Erro ao conectar WebSocket:", e);
        }
    }

    displaySessionInfo() {
        if (this.sessionDisplay) this.sessionDisplay.textContent = `Sessão: ${this.sessionId}`;
        if (this.photoCount) this.photoCount.textContent = `Fotos: ${this.photos.length}`;
        if (this.mobileStatus) this.mobileStatus.textContent = this.mobileConnected ? "Celular conectado" : "Celular não conectado";
    }

    generateSessionId() {
        return Math.random().toString(36).substring(2, 8);
    }
}

// Inicializar o sistema
window.addEventListener('DOMContentLoaded', () => {
    new PhotoBoothSystem();
});

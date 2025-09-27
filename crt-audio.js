// CRT Audio Effects
class CRTAudio {
    constructor() {
        this.audioContext = null;
        this.powerOnPlayed = false;
        this.humGainNode = null;
        this.humOscillator = null;
        this.scanlineGainNode = null;
        this.scanlineOscillator = null;
        this.isHumEnabled = true;
        this.isScanlineEnabled = true;
        this.isMuted = false;
        
        this.init();
    }
    
    async init() {
        try {
            // Create audio context on user interaction
            document.addEventListener('click', () => this.initAudioContext(), { once: true });
            document.addEventListener('keydown', () => this.initAudioContext(), { once: true });
            
            this.createControls();
            this.startPowerOnSequence();
        } catch (error) {
            console.log('CRT Audio init failed:', error);
        }
    }
    
    async initAudioContext() {
        if (this.audioContext) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.playPowerOnSound();
            this.startAmbientHum();
            this.startScanlineAudio();
            
        } catch (error) {
            console.log('Audio context creation failed:', error);
        }
    }
    
    createControls() {
        const controlsHTML = `
            <div class="crt-audio-controls">
                <button class="crt-audio-btn" id="crt-mute-btn" title="Toggle Audio">🔊</button>
                <button class="crt-audio-btn ${this.isHumEnabled ? 'active' : ''}" id="crt-hum-btn" title="Ambient Hum">HUM</button>
                <button class="crt-audio-btn ${this.isScanlineEnabled ? 'active' : ''}" id="crt-scan-btn" title="Scanline Audio">SCAN</button>
                <button class="crt-audio-btn" id="crt-power-btn" title="Replay Power-on">PWR</button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', controlsHTML);
        
        // Add event listeners
        document.getElementById('crt-mute-btn').addEventListener('click', () => this.toggleMute());
        document.getElementById('crt-hum-btn').addEventListener('click', () => this.toggleHum());
        document.getElementById('crt-scan-btn').addEventListener('click', () => this.toggleScanline());
        document.getElementById('crt-power-btn').addEventListener('click', () => this.replayPowerOn());
    }
    
    startPowerOnSequence() {
        const container = document.querySelector('.crt-container');
        if (container) {
            container.classList.add('powering-on');
            
            // Remove animation class after completion
            setTimeout(() => {
                container.classList.remove('powering-on');
            }, 2500);
        }
    }
    
    playPowerOnSound() {
        if (!this.audioContext || this.isMuted || this.powerOnPlayed) return;
        
        try {
            // Create power-on sound effect
            const duration = 1.5;
            const currentTime = this.audioContext.currentTime;
            
            // Main power-on "pop" and whir
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Power-on frequency sweep
            oscillator.frequency.setValueAtTime(60, currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, currentTime + 0.1);
            oscillator.frequency.exponentialRampToValueAtTime(200, currentTime + 0.4);
            oscillator.frequency.exponentialRampToValueAtTime(60, currentTime + duration);
            
            // Filter sweep
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(100, currentTime);
            filterNode.frequency.exponentialRampToValueAtTime(2000, currentTime + 0.2);
            filterNode.frequency.exponentialRampToValueAtTime(400, currentTime + duration);
            
            // Volume envelope
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.3, currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.1, currentTime + 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.05, currentTime + 0.8);
            gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
            
            oscillator.type = 'sawtooth';
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            // Add some noise for authenticity
            this.addPowerOnNoise(currentTime, duration);
            
            this.powerOnPlayed = true;
            
        } catch (error) {
            console.log('Power-on sound failed:', error);
        }
    }
    
    addPowerOnNoise(startTime, duration) {
        try {
            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Generate noise
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.1;
            }
            
            const noiseSource = this.audioContext.createBufferSource();
            const noiseGain = this.audioContext.createGain();
            
            noiseSource.buffer = buffer;
            noiseSource.connect(noiseGain);
            noiseGain.connect(this.audioContext.destination);
            
            noiseGain.gain.setValueAtTime(0.05, startTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            noiseSource.start(startTime);
            
        } catch (error) {
            console.log('Power-on noise failed:', error);
        }
    }
    
    startAmbientHum() {
        if (!this.audioContext || this.isMuted || !this.isHumEnabled) return;
        
        try {
            // Create subtle 60Hz hum with harmonics
            this.humOscillator = this.audioContext.createOscillator();
            this.humGainNode = this.audioContext.createGain();
            
            this.humOscillator.connect(this.humGainNode);
            this.humGainNode.connect(this.audioContext.destination);
            
            this.humOscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
            this.humOscillator.type = 'sine';
            
            // Very subtle volume
            this.humGainNode.gain.setValueAtTime(0.005, this.audioContext.currentTime);
            
            // Add slight variation
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            
            lfo.frequency.setValueAtTime(0.2, this.audioContext.currentTime);
            lfo.type = 'sine';
            lfoGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
            
            lfo.connect(lfoGain);
            lfoGain.connect(this.humOscillator.frequency);
            
            this.humOscillator.start();
            lfo.start();
            
        } catch (error) {
            console.log('Ambient hum failed:', error);
        }
    }
    
    startScanlineAudio() {
        if (!this.audioContext || this.isMuted || !this.isScanlineEnabled) return;
        
        try {
            // Very subtle high-frequency noise for scanlines
            const bufferSize = this.audioContext.sampleRate * 0.1; // 100ms buffer
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Generate high-frequency noise
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.02;
            }
            
            const playScanlineNoise = () => {
                if (!this.audioContext || this.isMuted || !this.isScanlineEnabled) return;
                
                const source = this.audioContext.createBufferSource();
                this.scanlineGainNode = this.audioContext.createGain();
                const filterNode = this.audioContext.createBiquadFilter();
                
                source.buffer = buffer;
                source.connect(filterNode);
                filterNode.connect(this.scanlineGainNode);
                this.scanlineGainNode.connect(this.audioContext.destination);
                
                filterNode.type = 'highpass';
                filterNode.frequency.setValueAtTime(8000, this.audioContext.currentTime);
                
                this.scanlineGainNode.gain.setValueAtTime(0.002, this.audioContext.currentTime);
                
                source.start();
                
                // Schedule next noise burst
                setTimeout(playScanlineNoise, 100 + Math.random() * 200);
            };
            
            playScanlineNoise();
            
        } catch (error) {
            console.log('Scanline audio failed:', error);
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        const btn = document.getElementById('crt-mute-btn');
        
        if (this.isMuted) {
            btn.textContent = '🔇';
            btn.classList.add('active');
            this.stopAllAudio();
        } else {
            btn.textContent = '🔊';
            btn.classList.remove('active');
            if (this.audioContext) {
                this.startAmbientHum();
                this.startScanlineAudio();
            }
        }
    }
    
    toggleHum() {
        this.isHumEnabled = !this.isHumEnabled;
        const btn = document.getElementById('crt-hum-btn');
        
        if (this.isHumEnabled) {
            btn.classList.add('active');
            if (this.audioContext && !this.isMuted) {
                this.startAmbientHum();
            }
        } else {
            btn.classList.remove('active');
            if (this.humOscillator) {
                this.humOscillator.stop();
                this.humOscillator = null;
            }
        }
    }
    
    toggleScanline() {
        this.isScanlineEnabled = !this.isScanlineEnabled;
        const btn = document.getElementById('crt-scan-btn');
        
        if (this.isScanlineEnabled) {
            btn.classList.add('active');
            if (this.audioContext && !this.isMuted) {
                this.startScanlineAudio();
            }
        } else {
            btn.classList.remove('active');
        }
    }
    
    replayPowerOn() {
        this.powerOnPlayed = false;
        this.startPowerOnSequence();
        if (this.audioContext && !this.isMuted) {
            this.playPowerOnSound();
        }
    }
    
    stopAllAudio() {
        if (this.humOscillator) {
            this.humOscillator.stop();
            this.humOscillator = null;
        }
    }
}

// Initialize CRT Audio when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CRTAudio();
});

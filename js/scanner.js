// QR Code Scanner for BLE Tag Tracker
// Uses jsQR library for QR code detection

let qrStream = null;
let qrAnimationId = null;
let isScanning = false;

// ===== QR SCANNER FUNCTIONS =====

/**
 * Start the QR code scanner
 */
async function startQRScanner() {
    const modal = document.getElementById('qrModal');
    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    const status = document.getElementById('qrStatus');
    
    // Show modal
    modal.classList.remove('hidden');
    
    try {
        // Request camera access
        status.textContent = 'Requesting camera access...';
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',  // Use back camera on mobile
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        qrStream = stream;
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        video.play();
        
        status.textContent = 'Position QR code within frame...';
        isScanning = true;
        
        // Wait for video to be ready
        video.addEventListener('loadedmetadata', () => {
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Start scanning
            requestAnimationFrame(scanQRCode);
        });
        
    } catch (error) {
        console.error('Camera access error:', error);
        status.textContent = 'Camera access denied. Please enable camera permissions.';
        
        setTimeout(() => {
            stopQRScanner();
        }, 3000);
    }
}

/**
 * Scan QR code from video feed
 */
function scanQRCode() {
    if (!isScanning) return;
    
    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    const status = document.getElementById('qrStatus');
    const ctx = canvas.getContext('2d');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Scan for QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
        });
        
        if (code) {
            console.log('✅ QR Code detected:', code.data);
            status.textContent = '✅ QR Code detected!';
            
            // Extract IMEI from QR code
            const imei = extractIMEIFromQR(code.data);
            
            if (imei) {
                console.log('✅ IMEI extracted:', imei);
                
                // Stop scanner
                stopQRScanner();
                
                // Add tag to map
                setTimeout(() => {
                    addTag(imei);  // Function from map.js
                }, 500);
            } else {
                status.textContent = '❌ No valid IMEI found in QR code';
                
                // Continue scanning after 2 seconds
                setTimeout(() => {
                    if (isScanning) {
                        status.textContent = 'Position QR code within frame...';
                    }
                }, 2000);
            }
        }
    }
    
    // Continue scanning
    qrAnimationId = requestAnimationFrame(scanQRCode);
}

/**
 * Extract IMEI from QR code data
 * Supports multiple QR code formats
 */
function extractIMEIFromQR(qrData) {
    console.log('Extracting IMEI from QR data:', qrData);
    
    // Pattern 1: MHub369F:IMEI868695060772926:MAC format
    const pattern1 = /IMEI(\d{15})/i;
    const match1 = qrData.match(pattern1);
    if (match1) {
        return match1[1];
    }
    
    // Pattern 2: Plain IMEI (15 digits)
    const pattern2 = /\b(\d{15})\b/;
    const match2 = qrData.match(pattern2);
    if (match2) {
        return match2[1];
    }
    
    // Pattern 3: JSON format
    try {
        const json = JSON.parse(qrData);
        if (json.imei && /^\d{15}$/.test(json.imei)) {
            return json.imei;
        }
    } catch (e) {
        // Not JSON
    }
    
    // Pattern 4: Key-value format (imei=868695060734355)
    const pattern4 = /imei[=:]\s*(\d{15})/i;
    const match4 = qrData.match(pattern4);
    if (match4) {
        return match4[1];
    }
    
    // Pattern 5: URL format
    const pattern5 = /\/imei\/(\d{15})/i;
    const match5 = qrData.match(pattern5);
    if (match5) {
        return match5[1];
    }
    
    console.warn('No IMEI pattern matched in QR data');
    return null;
}

/**
 * Validate IMEI (Luhn algorithm check - optional)
 */
function validateIMEI(imei) {
    if (!imei || imei.length !== 15) {
        return false;
    }
    
    // Simple validation: all digits
    return /^\d{15}$/.test(imei);
}

/**
 * Stop QR scanner and release camera
 */
function stopQRScanner() {
    const modal = document.getElementById('qrModal');
    const video = document.getElementById('qrVideo');
    
    // Stop scanning loop
    isScanning = false;
    if (qrAnimationId) {
        cancelAnimationFrame(qrAnimationId);
        qrAnimationId = null;
    }
    
    // Stop video stream
    if (qrStream) {
        qrStream.getTracks().forEach(track => track.stop());
        qrStream = null;
    }
    
    // Clear video
    video.srcObject = null;
    
    // Hide modal
    modal.classList.add('hidden');
    
    console.log('🛑 QR Scanner stopped');
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    // Close QR modal button
    document.getElementById('closeQRBtn').addEventListener('click', stopQRScanner);
    
    // Close QR modal on background click
    document.getElementById('qrModal').addEventListener('click', (e) => {
        if (e.target.id === 'qrModal') {
            stopQRScanner();
        }
    });
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isScanning) {
            stopQRScanner();
        }
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (isScanning) {
        stopQRScanner();
    }
});

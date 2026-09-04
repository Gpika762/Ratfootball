const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Función para leer las noticias guardadas
function obtenerNoticias() {
    const rutaNoticias = path.join(__dirname, 'noticias.json');
    if (fs.existsSync(rutaNoticias)) {
        const raw = fs.readFileSync(rutaNoticias);
        return JSON.parse(raw);
    }
    return [];
}

// 1. WEB PRINCIPAL (Comic Sans y Redirección)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. PANEL ADMIN PARA EL EDITOR
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 3. API GAMEMAKER: Configuración del Juego y Pantalla "Presiona A"
app.get('/api/config_inicio', (req, res) => {
    res.json({
        servidor: {
            status: "online",
            texto_inicio: "PRESIONA A PARA EMPEZAR",
            fuente: "fnt_pixel"
        },
        jugador: {
            copas: 111,
            monedas: 19060,
            skin: "raton_aniversario"
        }
    });
});

// 4. API GAMEMAKER & WEB: Lista de Noticias
app.get('/api/noticias', (req, res) => {
    res.json(obtenerNoticias());
});

app.listen(PORT, () => {
    console.log(`Servidor RatFootballgame activo en el puerto ${PORT}`);
});

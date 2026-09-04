const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Función auxiliar para leer noticias sin errores
function obtenerNoticias() {
    const rutaNoticias = path.join(__dirname, 'noticias.json');
    try {
        if (fs.existsSync(rutaNoticias)) {
            const raw = fs.readFileSync(rutaNoticias, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (error) {
        console.error("Error al leer noticias.json:", error);
    }
    return [];
}

// 1. WEB PRINCIPAL (Sirve el HTML con diseño)
app.get('/', (req, res) => {
    const rutaIndex = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(rutaIndex)) {
        res.sendFile(rutaIndex);
    } else {
        res.send("<h1>Rat Football Web</h1><p>El archivo public/index.html no fue encontrado.</p>");
    }
});

// 2. PANEL ADMIN
app.get('/admin', (req, res) => {
    const rutaAdmin = path.join(__dirname, 'public', 'admin.html');
    if (fs.existsSync(rutaAdmin)) {
        res.sendFile(rutaAdmin);
    } else {
        res.send("<h1>Panel de Administración</h1><p>El archivo public/admin.html no fue encontrado.</p>");
    }
});

// 3. API GAMEMAKER: Configuración inicial
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

// 4. API GAMEMAKER & WEB: Noticias en JSON
app.get('/api/noticias', (req, res) => {
    res.json(obtenerNoticias());
});

// Manejador para rutas no encontradas (Evita errores feos de Express)
app.use((req, res) => {
    res.status(404).send("<h1 style='font-family: Comic Sans MS; text-align: center; margin-top: 50px;'>404 - ¡Esta página no existe en el servidor de Rat Football! 🧀</h1>");
});

app.listen(PORT, () => {
    console.log(`Servidor RatFootballgame activo en el puerto ${PORT}`);
});

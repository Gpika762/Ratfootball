const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Pool de conexión a Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. RUTAS WEB
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 2. API GAMEMAKER: Obtener datos de inicio del Jugador
app.get('/api/config_inicio', async (req, res) => {
    try {
        const resultadoJugador = await pool.query('SELECT * FROM jugadores ORDER BY id ASC LIMIT 1');
        
        let datosJugador = {
            copas: 0,
            monedas: 0,
            skin: "raton_clasico"
        };

        if (resultadoJugador.rows.length > 0) {
            const row = resultadoJugador.rows[0];
            datosJugador = {
                copas: row.copas,
                monedas: row.monedas,
                skin: row.skin_equipada
            };
        }

        res.json({
            servidor: {
                status: "online",
                texto_inicio: "PRESIONA A PARA EMPEZAR",
                fuente: "fnt_pixel"
            },
            jugador: datosJugador
        });
    } catch (error) {
        console.error("Error al consultar la base de datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// 3. API GAMEMAKER: Guardar/Actualizar progreso del jugador
app.post('/api/guardar_progreso', async (req, res) => {
    const { username, monedas, copas, skin } = req.body;

    if (!username) {
        return res.status(400).json({ error: "Falta el nombre de usuario" });
    }

    try {
        const query = `
            INSERT INTO jugadores (username, monedas, copas, skin_equipada)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (username) 
            DO UPDATE SET monedas = $2, copas = $3, skin_equipada = $4;
        `;
        await pool.query(query, [username, monedas, copas, skin]);
        res.json({ exito: true, mensaje: "Progreso guardado en Neon DB" });
    } catch (error) {
        console.error("Error al guardar progreso:", error);
        res.status(500).json({ error: "Error al guardar los datos" });
    }
});

// 4. API NOTICIAS: Leer noticias
app.get('/api/noticias', async (req, res) => {
    try {
        const resultadoNoticias = await pool.query('SELECT * FROM noticias ORDER BY fecha DESC');
        res.json(resultadoNoticias.rows);
    } catch (error) {
        console.error("Error al obtener noticias:", error);
        res.status(500).json([]);
    }
});

// 5. API NOTICIAS: Publicar nueva noticia desde el Admin Panel
app.post('/api/noticias', async (req, res) => {
    const { titulo, descripcion, es_urgente } = req.body;
    try {
        await pool.query(
            'INSERT INTO noticias (titulo, descripcion, es_urgente) VALUES ($1, $2, $3)',
            [titulo, descripcion, es_urgente || false]
        );
        res.json({ exito: true, mensaje: "Noticia publicada correctamente" });
    } catch (error) {
        console.error("Error al publicar noticia:", error);
        res.status(500).json({ error: "No se pudo publicar la noticia" });
    }
});

// Control de rutas 404
app.use((req, res) => {
    res.status(404).send("<h1 style='font-family: Comic Sans MS; text-align: center; margin-top: 50px;'>404 - ¡Ruta no encontrada en Rat Football! 🧀</h1>");
});

app.listen(PORT, () => {
    console.log(`Servidor RatFootball activo en el puerto ${PORT}`);
});

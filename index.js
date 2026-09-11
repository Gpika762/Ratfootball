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

// -------------------------------------------------------------
// 1. RUTAS WEB Y ADMIN
// -------------------------------------------------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// -------------------------------------------------------------
// 2. API GAMEMAKER: CONFIGURACIÓN DE INICIO
// -------------------------------------------------------------
app.get('/api/config_inicio', async (req, res) => {
    try {
        res.json({
            servidor: {
                status: "online",
                texto_inicio: "PRESIONA A PARA EMPEZAR",
                fuente: "fnt_pixel"
            }
        });
    } catch (error) {
        console.error("Error en config_inicio:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// -------------------------------------------------------------
// 3. API AUTENTICACIÓN: REGISTRO DE USUARIOS
// -------------------------------------------------------------
app.post('/api/registro', async (req, res) => {
    let { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ exito: false, mensaje: "Debes ingresar usuario y contraseña" });
    }

    username = username.trim();
    password = password.trim();

    if (username === "" || password === "") {
        return res.status(400).json({ exito: false, mensaje: "Los campos no pueden estar vacíos" });
    }

    try {
        const existe = await pool.query('SELECT id FROM jugadores WHERE LOWER(username) = LOWER($1)', [username]);
        if (existe.rows.length > 0) {
            return res.json({ exito: false, mensaje: "El nombre de usuario ya está registrado" });
        }

        // Skins iniciales (solo raton_clasico)
        const skinsIniciales = JSON.stringify(['raton_clasico']);

        const nuevo = await pool.query(
            'INSERT INTO jugadores (username, password, monedas, copas, skin_equipada, skins_desbloqueadas) VALUES ($1, $2, 0, 0, $3, $4) RETURNING *',
            [username, password, 'raton_clasico', skinsIniciales]
        );

        let skinsArr = ['raton_clasico'];
        try {
            skinsArr = typeof nuevo.rows[0].skins_desbloqueadas === 'string' 
                ? JSON.parse(nuevo.rows[0].skins_desbloqueadas) 
                : nuevo.rows[0].skins_desbloqueadas;
        } catch (e) {}

        res.json({
            exito: true,
            mensaje: "¡Cuenta creada exitosamente!",
            jugador: {
                username: nuevo.rows[0].username,
                monedas: nuevo.rows[0].monedas,
                copas: nuevo.rows[0].copas,
                skin: nuevo.rows[0].skin_equipada,
                skins_desbloqueadas: skinsArr
            }
        });
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ exito: false, mensaje: "Error al registrar la cuenta" });
    }
});

// -------------------------------------------------------------
// 4. API AUTENTICACIÓN: INICIO DE SESIÓN (LOGIN)
// -------------------------------------------------------------
app.post('/api/login', async (req, res) => {
    let { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ exito: false, mensaje: "Ingresa usuario y contraseña" });
    }

    username = username.trim();
    password = password.trim();

    try {
        const resultado = await pool.query(
            'SELECT * FROM jugadores WHERE LOWER(username) = LOWER($1) AND password = $2',
            [username, password]
        );

        if (resultado.rows.length > 0) {
            const row = resultado.rows[0];

            let skinsArr = ['raton_clasico'];
            if (row.skins_desbloqueadas) {
                try {
                    skinsArr = typeof row.skins_desbloqueadas === 'string' 
                        ? JSON.parse(row.skins_desbloqueadas) 
                        : row.skins_desbloqueadas;
                } catch (e) {}
            }

            res.json({
                exito: true,
                mensaje: "¡Inicio de sesión exitoso!",
                jugador: {
                    username: row.username,
                    monedas: row.monedas,
                    copas: row.copas,
                    skin: row.skin_equipada,
                    skins_desbloqueadas: skinsArr
                }
            });
        } else {
            res.json({ exito: false, mensaje: "Usuario o contraseña incorrectos" });
        }
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ exito: false, mensaje: "Error en el servidor al iniciar sesión" });
    }
});

// -------------------------------------------------------------
// 5. API TIENDA: COMPRAR SKIN / OFERTA ESPECIAL
// -------------------------------------------------------------
app.post('/api/comprar_skin', async (req, res) => {
    let { username, skin_id, precio } = req.body;

    if (!username || !skin_id || precio === undefined) {
        return res.status(400).json({ exito: false, mensaje: "Datos de compra incompletos" });
    }

    username = username.trim();

    try {
        const resultado = await pool.query(
            'SELECT * FROM jugadores WHERE LOWER(username) = LOWER($1)',
            [username]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: "Usuario no encontrado" });
        }

        const row = resultado.rows[0];
        let skinsArr = [];

        if (row.skins_desbloqueadas) {
            try {
                skinsArr = typeof row.skins_desbloqueadas === 'string' 
                    ? JSON.parse(row.skins_desbloqueadas) 
                    : row.skins_desbloqueadas;
            } catch (e) {}
        }

        if (skinsArr.includes(skin_id)) {
            return res.json({ exito: false, mensaje: "Ya posees esta skin" });
        }

        if (row.monedas < precio) {
            return res.json({ exito: false, mensaje: "Monedas insuficientes" });
        }

        const nuevasMonedas = row.monedas - precio;
        skinsArr.push(skin_id);

        const skinsGuardar = JSON.stringify(skinsArr);

        await pool.query(
            'UPDATE jugadores SET monedas = $1, skins_desbloqueadas = $2 WHERE LOWER(username) = LOWER($3)',
            [nuevasMonedas, skinsGuardar, username]
        );

        res.json({
            exito: true,
            mensaje: "¡Compra realizada con éxito!",
            monedas: nuevasMonedas,
            skins_desbloqueadas: skinsArr
        });

    } catch (error) {
        console.error("Error al comprar skin:", error);
        res.status(500).json({ exito: false, mensaje: "Error al procesar la compra" });
    }
});

// -------------------------------------------------------------
// 6. API TIENDA: EQUIPAR SKIN
// -------------------------------------------------------------
app.post('/api/equipar_skin', async (req, res) => {
    let { username, skin_id } = req.body;

    if (!username || !skin_id) {
        return res.status(400).json({ exito: false, mensaje: "Datos incompletos" });
    }

    username = username.trim();

    try {
        const resultado = await pool.query(
            'SELECT skins_desbloqueadas FROM jugadores WHERE LOWER(username) = LOWER($1)',
            [username]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: "Usuario no encontrado" });
        }

        let skinsArr = [];
        const rawSkins = resultado.rows[0].skins_desbloqueadas;

        if (rawSkins) {
            try {
                skinsArr = typeof rawSkins === 'string' ? JSON.parse(rawSkins) : rawSkins;
            } catch (e) {}
        }

        if (!skinsArr.includes(skin_id)) {
            return res.json({ exito: false, mensaje: "No tienes esta skin desbloqueada" });
        }

        await pool.query(
            'UPDATE jugadores SET skin_equipada = $1 WHERE LOWER(username) = LOWER($2)',
            [skin_id, username]
        );

        res.json({
            exito: true,
            mensaje: "Skin equipada correctamente",
            skin_equipada: skin_id
        });

    } catch (error) {
        console.error("Error al equipar skin:", error);
        res.status(500).json({ exito: false, mensaje: "Error en el servidor al equipar skin" });
    }
});

// -------------------------------------------------------------
// 7. API GAMEMAKER: GUARDAR PROGRESO DEL JUGADOR
// -------------------------------------------------------------
app.post('/api/guardar_progreso', async (req, res) => {
    let { username, monedas, copas, skin } = req.body;

    if (!username) {
        return res.status(400).json({ exito: false, mensaje: "Falta el usuario" });
    }

    username = username.trim();

    try {
        await pool.query(
            `UPDATE jugadores SET monedas = $1, copas = $2, skin_equipada = $3 WHERE LOWER(username) = LOWER($4)`,
            [monedas, copas, skin, username]
        );
        res.json({ exito: true, mensaje: "Progreso guardado correctamente" });
    } catch (error) {
        console.error("Error al guardar progreso:", error);
        res.status(500).json({ exito: false, mensaje: "Error al guardar progreso" });
    }
});

// -------------------------------------------------------------
// 8. API NOTICIAS
// -------------------------------------------------------------
app.get('/api/noticias', async (req, res) => {
    try {
        const resultadoNoticias = await pool.query('SELECT * FROM noticias ORDER BY fecha DESC');
        res.json(resultadoNoticias.rows);
    } catch (error) {
        console.error("Error al obtener noticias:", error);
        res.status(500).json([]);
    }
});

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

// Ruta 404
app.use((req, res) => {
    res.status(404).send("<h1 style='font-family: Arial; text-align: center; margin-top: 50px;'>404 - ¡Ruta no encontrada en Rat Football! 🧀</h1>");
});

app.listen(PORT, () => {
    console.log(`Servidor RatFootball activo en el puerto ${PORT}`);
});

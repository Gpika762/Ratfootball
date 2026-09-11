const express = require('express');
const app = express();
app.use(express.json());

// BASE DE DATOS TEMPORAL (En memoria o la conectas a Neon PostgreSQL)
let baseDeDatos = {
    "Ralsei": {
        username: "Ralsei",
        password: "123", // Recuerda usar hash en producción
        monedas: 18960,
        copas: 110,
        skin_equipada: "rat_meteor_homer",
        skins_desbloqueadas: [
            "rat_common_base",
            "rat_common_santa",
            "ninja_base",
            "ninja_tree",
            "rat_meteor_homer"
        ]
    }
};

// -------------------------------------------------------------
// 1. RUTA DE REGISTRO (Cuentas Nuevas)
// -------------------------------------------------------------
app.post('/registro', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ exito: false, mensaje: "Usuario y contraseña requeridos" });
    }

    if (baseDeDatos[username]) {
        return res.json({ exito: false, mensaje: "El usuario ya existe" });
    }

    // Cuenta inicial: 0 monedas, 0 copas y solo la skin base
    const nuevoJugador = {
        username: username,
        password: password,
        monedas: 0,
        copas: 0,
        skin_equipada: "rat_common_base",
        skins_desbloqueadas: ["rat_common_base"]
    };

    baseDeDatos[username] = nuevoJugador;

    res.json({
        exito: true,
        mensaje: "¡Registro exitoso!",
        jugador: {
            username: nuevoJugador.username,
            monedas: nuevoJugador.monedas,
            copas: nuevoJugador.copas,
            skin_equipada: nuevoJugador.skin_equipada,
            skins_desbloqueadas: nuevoJugador.skins_desbloqueadas
        }
    });
});

// -------------------------------------------------------------
// 2. RUTA DE LOGIN
// -------------------------------------------------------------
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const jugador = baseDeDatos[username];

    if (jugador && jugador.password === password) {
        return res.json({
            exito: true,
            mensaje: "¡Inicio de sesión exitoso!",
            jugador: {
                username: jugador.username,
                monedas: jugador.monedas,
                copas: jugador.copas,
                skin_equipada: jugador.skin_equipada,
                skins_desbloqueadas: jugador.skins_desbloqueadas
            }
        });
    }

    res.json({ exito: false, mensaje: "Credenciales incorrectas" });
});

// -------------------------------------------------------------
// 3. RUTA PARA COMPRAR SKIN (Ofertas o Tienda)
// -------------------------------------------------------------
app.post('/comprar-skin', (req, res) => {
    const { username, skin_id, precio } = req.body;
    const jugador = baseDeDatos[username];

    if (!jugador) {
        return res.json({ exito: false, mensaje: "Usuario no encontrado" });
    }

    if (jugador.skins_desbloqueadas.includes(skin_id)) {
        return res.json({ exito: false, mensaje: "Ya posees esta carta de skin" });
    }

    if (jugador.monedas >= precio) {
        jugador.monedas -= precio;
        jugador.skins_desbloqueadas.push(skin_id);

        return res.json({
            exito: true,
            mensaje: "¡Skin comprada!",
            monedas: jugador.monedas,
            skins_desbloqueadas: jugador.skins_desbloqueadas
        });
    } else {
        return res.json({ exito: false, mensaje: "Monedas insuficientes" });
    }
});

// -------------------------------------------------------------
// 4. RUTA PARA EQUIPAR SKIN
// -------------------------------------------------------------
app.post('/equipar-skin', (req, res) => {
    const { username, skin_id } = req.body;
    const jugador = baseDeDatos[username];

    if (!jugador) {
        return res.json({ exito: false, mensaje: "Usuario no encontrado" });
    }

    if (jugador.skins_desbloqueadas.includes(skin_id)) {
        jugador.skin_equipada = skin_id;
        return res.json({ exito: true, mensaje: "Skin equipada correctamente", skin_equipada: skin_id });
    } else {
        return res.json({ exito: false, mensaje: "No posees esta skin" });
    }
});

app.listen(3000, () => console.log("Servidor de Rat Football corriendo en puerto 3000"));

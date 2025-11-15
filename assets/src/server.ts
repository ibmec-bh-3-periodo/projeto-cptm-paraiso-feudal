import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";

const server = express();

server.use(cors());
server.use(express.json());

function readDB() {
    const dbPath = path.join(__dirname, 'usuario.json')
    const data = fs.readFileSync(dbPath, 'utf-8')
    return JSON.parse(data)
}

function writeDB(data: any) {
    const dbPath = path.join(__dirname, 'usuario.json')
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

server.post("/api/cadastro", (req: Request, res: Response) => {
    try {
        const { email, cpf, senha } = req.body

        if (!email || !cpf || !senha) {
            return res.status(400).json({
                mensagem: "Todos os campos são obrigatórios"
            })
        }

        const db = readDB()

        const userExists = db.usuarios.some((user: any) => 
            user.email === email || user.cpf === cpf
        )

        if (userExists) {
            return res.status(400).json({
                mensagem: "Usuário já cadastrado"
            })
        }

        const newUser = {
            id: db.usuarios.length + 1,
            nome: "Temporário",
            cpf,
            email,
            senha,
            saldo: 0,
            alerta: false
        }

        db.usuarios.push(newUser)
        writeDB(db)

        res.status(201).json({
            mensagem: "Cadastro realizado com sucesso",
            usuario: newUser
        })

    } catch (error) {
        console.error('[POST /api/cadastro] Erro:', error);
        res.status(500).json({
            mensagem: "Erro interno do servidor"
        })
    }
})

server.put("/api/usuario/apelido", (req: Request, res: Response) => {
    try {
        console.log(`[PUT /api/usuario/apelido] Requisição recebida:`, req.body);

        const { email, apelido } = req.body

        if (!email || !apelido) {
            console.warn(`[PUT /api/usuario/apelido] Erro 400: Campos faltando. Email: ${email}, Apelido: ${apelido}`);
            return res.status(400).json({
                mensagem: "Email e apelido são obrigatórios"
            })
        }

        const db = readDB()
        
        console.log(`[PUT /api/usuario/apelido] Procurando por email: ${email}`);
        const userIndex = db.usuarios.findIndex((user: any) => user.email === email)

        if (userIndex === -1) {
            console.warn(`[PUT /api/usuario/apelido] Erro 404: Email ${email} não encontrado no banco de dados.`);
            return res.status(404).json({
                mensagem: "Usuário não encontrado"
            })
        }

        console.log(`[PUT /api/usuario/apelido] Usuário encontrado (Índice: ${userIndex}). Atualizando nome para: ${apelido}`);
        db.usuarios[userIndex].nome = apelido
        writeDB(db)

        return res.status(200).json({
            mensagem: "Apelido atualizado com sucesso"
        })

    } catch (error) {
        console.error('[PUT /api/usuario/apelido] Erro 500 (Catch):', error)
        return res.status(500).json({
            mensagem: "Erro interno do servidor"
        })
    }
})

server.put("/api/usuario/saldo", (req: Request, res: Response) => {
    try {
        const { email, amount } = req.body;

        if (!email || typeof amount === "undefined") {
            return res.status(400).json({ mensagem: "Email e amount são obrigatórios" });
        }

        const db = readDB();
        const userIndex = db.usuarios.findIndex((u: any) => u.email === email);

        if (userIndex === -1) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        const atual = Number(db.usuarios[userIndex].saldo || 0);
        db.usuarios[userIndex].saldo = Number((atual + Number(amount)).toFixed(2));
        writeDB(db);

        return res.status(200).json({ mensagem: "Saldo atualizado com sucesso", usuario: db.usuarios[userIndex] });
    } catch (error) {
        console.error('[PUT /api/usuario/saldo] Erro:', error);
        return res.status(500).json({ mensagem: "Erro interno do servidor" });
    }
})

server.get("/api/estacoes", (req: Request, res: Response) => {
    try {
        const filePath = path.join(__dirname, "estacoes.json");
        const raw = fs.readFileSync(filePath, "utf8");
        const linhas = JSON.parse(raw) as Array<any>;

        const nomes: string[] = [];
        linhas.forEach((linha) => {
            if (Array.isArray(linha.trajeto)) {
                linha.trajeto.forEach((estacao: string) => nomes.push(estacao));
            }
        });

        const unique = Array.from(new Set(nomes))
            .sort((a, b) => a.localeCompare(b, "pt-BR"));

        return res.json(unique);
    } catch (err) {
        console.error("Erro ao ler estacoes.json:", err);
        return res.status(500).json({ 
            error: "Erro ao ler estações",
            details: err instanceof Error ? err.message : String(err)
        });
    }
});

server.post("/gera-mapa", async (req: Request, res: Response) => {
    const { origin, destination } = req.body || {};
    if (!origin || !destination) {
        return res.status(400).json({ 
            ok: false, 
            error: "origin e destination são obrigatórios" 
        });
    }

    console.log("Gera mapa solicitado:", origin, "->", destination);

    try {
        const { spawn } = await import('child_process');
        const scriptPath = path.join(__dirname, 'mapa_estacoes.py');
        const args = [
            '--start', origin,
            '--end', destination
        ];

        const py = spawn('python', [scriptPath, ...args], { 
            cwd: __dirname
        });

        let stdout = '';
        let stderr = '';

        py.stdout.on('data', (data) => {
            const text = data.toString();
            stdout += text;
            console.log('[Python stdout]', text.trim());
        });
        py.stderr.on('data', (data) => {
            const text = data.toString();
            stderr += text;
            console.error('[Python stderr]', text.trim());
        });

        py.on('close', (code) => {
            console.log(`Python process exited with code ${code}`);
            
            if (code === 0) {
                const url = `/src/mapa_rota.html`;
                return res.json({ 
                    ok: true, 
                    origin, 
                    destination, 
                    url,
                    output: stdout 
                });
            } else {
                return res.status(500).json({ 
                    ok: false, 
                    error: 'Erro ao gerar mapa', 
                    code,
                    stderr, 
                    stdout 
                });
            }
        });
    } catch (err) {
        console.error('Erro ao executar script python:', err);
        return res.status(500).json({ 
            ok: false, 
            error: 'Erro interno ao executar script',
            details: err instanceof Error ? err.message : String(err)
        });
    }
});

const assetsDir = path.join(__dirname, "..");
server.use(express.static(assetsDir));

server.get("/usuario.json", (req: Request, res: Response) => {
    try {
      const db = readDB(); 
      return res.json(db);
    } catch (error) {
      console.error("[GET /usuario.json] Erro ao ler usuario.json:", error);
      return res.status(500).json({ mensagem: "Erro ao ler usuario.json" });
    }
});

server.get("/", (req: Request, res: Response) => {
    res.redirect('/html/mapa.html');
});

server.post("/api/login", (req: Request, res: Response) => {
    try {
        console.log(`[POST /api/login] Requisição recebida:`, req.body);

        const { email, senha } = req.body;
        if (!email || !senha) {
            console.warn(`[POST /api/login] Erro 400: Campos faltando. Email: ${email}`);
            return res.status(400).json({ mensagem: "Email e senha são obrigatórios" });
        }

        const db = readDB();
        const user = db.usuarios.find((u: any) => u.email === email);

        if (!user) {
            console.warn(`[POST /api/login] Erro 404: Email ${email} não encontrado.`);
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        if (user.senha !== senha) {
            console.warn(`[POST /api/login] Erro 401: Senha incorreta para ${email}.`);
            return res.status(401).json({ mensagem: "Credenciais inválidas" });
        }

        const { senha: _, ...userSafe } = user;
        console.log(`[POST /api/login] Login bem-sucedido: ${email}`);

        return res.status(200).json({
            mensagem: "Login efetuado com sucesso",
            usuario: userSafe
        });
    } catch (error) {
        console.error('[POST /api/login] Erro:', error);
        return res.status(500).json({ mensagem: "Erro interno do servidor" });
    }
})

/**
 * PUT /api/alerta
 * Atualiza o status de alerta do usuário baseado no CPF
 * 
 * Corpo da requisição:
 * {
 *   cpf: string,     // CPF do usuário
 *   alerta: boolean  // true ou false
 * }
 * 
 * Resposta:
 * {
 *   ok: true,
 *   message: "Alerta atualizado"
 * }
 */
server.put("/api/alerta", (req: Request, res: Response) => {
    try {
        const { cpf, alerta } = req.body;

        if (!cpf || alerta === undefined) {
            return res.status(400).json({ error: "CPF e status de alerta são obrigatórios" });
        }

        const db = readDB();
        const userIndex = db.usuarios.findIndex((user: any) => String(user.cpf) === String(cpf));

        if (userIndex === -1) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        db.usuarios[userIndex].alerta = alerta;
        writeDB(db);

        console.log(`✅ Alerta do usuário CPF ${cpf} alterado para: ${alerta}`);
        return res.status(200).json({ ok: true, message: "Alerta atualizado" });
    } catch (error) {
        console.error("❌ Erro ao atualizar alerta:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
});

server.post("/api/alerta/confirmar", (req: Request, res: Response) => {
    try {
      const { cpf } = req.body;
      if (!cpf) return res.sendStatus(400);
  
      const db = readDB();
      const usuario = db.usuarios.find((u: any) => u.cpf === cpf);
  
      if (!usuario) return res.sendStatus(404);
  
      usuario.alerta = false;
      writeDB(db);
  
      return res.sendStatus(200);
    } catch {
      return res.sendStatus(500);
    }
});

server.get("/api/usuario", (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ mensagem: "Email é obrigatório" });
    }

    const db = readDB();
    const usuario = db.usuarios.find((u: any) => u.email === email);

    if (!usuario) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    return res.status(200).json({
      mensagem: "Usuário encontrado",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        saldo: usuario.saldo,
      },
    });
  } catch (error) {
    console.error("[GET /api/usuario] Erro:", error);
    return res.status(500).json({ mensagem: "Erro interno do servidor" });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5001;

function startServer() {
    try {
        const httpServer = server.listen(PORT, () => {
            console.log(`[server] Escutando em http://127.0.0.1:${PORT}`);
        });

        httpServer.on('error', (err) => {
            console.error('[server] Erro no servidor:', err);
        });

        httpServer.on('close', () => {
            console.log('[server] Servidor fechado. Tentando reiniciar...');
            setTimeout(startServer, 5000);
        });

        setInterval(() => {
            console.log('[server] Status: Ativo');
        }, 30000);

    } catch (err) {
        console.error('[server] Erro ao iniciar o servidor:', err);
        setTimeout(startServer, 5000);
    }
}

startServer();
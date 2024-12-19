import express from 'express'
import { spawn } from 'child_process'
import sqlite3 from 'sqlite3'
import { BASE_PATH, DB_NAME, URL_TO_TEST } from './config/constants.js'

const sql3 = sqlite3.verbose()
const db = new sql3.Database(`${DB_NAME}.db`)

const port = process.env.PORT

db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    path TEXT,
    executor TEXT
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    command TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  )
`)

const app = express()

app.use(express.json())

app.post('/projects', (req, res) => {
  const { name, path, executor } = req.body
  db.run('INSERT INTO projects (name, path, executor) VALUES (?, ?, ?)', [name, path, executor], (err) => {
    if (err) {
      console.error(err.message)
      res.status(500).send('Error al crear el proyecto')
    } else {
      res.send('Proyecto creado correctamente')
    }
  })
})

app.get('/projects', (req, res) => {
  db.all('SELECT * FROM projects', (err, row) => {
    if (err) {
      console.error(err.message)
      res.status(500).send('Error al obtener los proyectos')
    } else {
      console.log(row)
      res.send(row)
    }
  })
})

app.post('/commands', (req, res) => {
  const { projectId, command} = req.body
  db.run('INSERT INTO commands (project_id, command) VALUES (?, ?)', [projectId, command], (err) => {
    if (err) {
      console.error(err.message)
      res.status(500).send('Error al crear el comando')
    } else {
      res.send('Comando creado correctamente')
    }
  })
})

app.get('/commands', (req, res) => {
  db.all('SELECT * FROM commands', (err, row) => {
    if (err) {
      console.error(err.message)
      res.status(500).send('Error al crear el comando')
    } else {
      res.send(row)
    }
  })
})

app.post('/execute', (req, res) => {
  let { commandId } = req.body
  if (commandId === 'test') {
    const url = URL_TO_TEST;
    const child = spawn('open', [url]);

    child.on('error', (err) => {
      console.error('Error al abrir el navegador:', err);
      res.status(500).send('Error al abrir el navegador');
    });
    setTimeout(()=>child.kill('SIGTERM'));

    res.send('Navegador abierto con éxito en segundo plano');
  } else {
    db.get('SELECT projects.path, projects.executor, commands.command FROM projects JOIN commands ON projects.id = commands.project_id WHERE commands.id = ?', [commandId], (err, row) => {
      if (err) {
        console.error(err.message)
        res.status(500).send('Error al ejecutar el comando')
      } else {
        const { executor, path, command } = row
        const fullCommand = `cd ${BASE_PATH}/${path} && ${executor} ${command}`
        res.send(run(fullCommand))
      }
    })
  }
})

function run(fullCommand) {
  console.log('Ejecutando comando:', fullCommand)
  const child = spawn(fullCommand, { shell: true })
  let output = ''
  child.stdout.on('data', (data) => {
    output += data.toString()
  })
  child.stderr.on('data', (data) => {
    output += data.toString()
  })
  child.on('close', (code) => {
    return ({ output, code })
  })

}

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`)
})

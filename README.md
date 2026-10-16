# Candidato Compass

Aplicación web del candidato, en formato de app al abrirla en el móvil. El cliente es React con Vite, MUI y Zustand. La API es FastAPI con MongoDB (Beanie), el mismo tipo de stack que Kulteo, limitado a este flujo.

Al cerrar, si `KULTEO_BASE_URL` está definida, la API crea los documentos en Kulteo igual que el simulador: un ítem por fichero, el formulario 145 como plantilla y el callback del workflow. Sin esa URL el cierre se queda en Mongo.

Kulteo da de alta la ficha con la misma llamada que al simulador:

```bash
curl -s -X POST http://localhost:8000/api/candidates \
  -H "X-Api-Key: changeme" \
  -H "Content-Type: application/json" \
  -d '{"id_object":"664f1c2a9b1e4c0012ab34cd","PERID":"12345678Z","VORNA":"Ana","NACHN":"García","EMAIL":"ana@example.com","DNI_ANVERSO":"SI","DNI_REVERSO":"SI","CV":"SI"}'
```

El registro de la pantalla solo crea la contraseña si ese DNI ya existe.

## Requisitos

- Python 3.12
- Node 20 o superior
- MongoDB en `localhost:27017`

## API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/seed.py
uvicorn app.main:app --reload
```

La documentación interactiva queda en `http://localhost:8000/docs`.

El candidato de ejemplo es el DNI `12345678Z`, con DNI por las dos caras y CV pendientes, y el paso abierto para edición.

## Cliente

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. En el móvil, o con la ventana estrecha, se ve como una columna de aplicación.

1. Regístrate con el DNI `12345678Z`, un email y una contraseña de al menos 8 caracteres con mayúsculas, minúsculas y un número.
2. Copia el código de 6 dígitos que aparece en la consola de la API y valídalo.
3. Entra y recorre datos, documentos, modelo 145 y cláusulas.

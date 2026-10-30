# Integración con Cursor

Integra KeyRouter con Cursor IDE para enrutar tus solicitudes de IA a través del sistema de enrutamiento inteligente de KeyRouter.

## Requisitos previos

- Cursor IDE instalado
- Cuenta Cursor Pro (requerida para endpoints de API personalizados)
- Una URL pública HTTPS que apunte a tu instancia de KeyRouter (por ejemplo mediante un túnel ngrok o cloudflared)
- API key del dashboard de KeyRouter

## ⚠️ Notas importantes

> **Se requiere URL pública**: Cursor enruta solicitudes a través de su propio servidor y no soporta endpoints `localhost`. Debes exponer tu instancia local de KeyRouter a internet con un túnel (por ejemplo ngrok o cloudflared) y usar esa URL pública HTTPS aquí.

> **Cursor Pro requerido**: Esta característica requiere una cuenta Cursor Pro para usar endpoints de API personalizados.

## Configuración

### 1. Abrir la configuración de Cursor

1. Abre Cursor IDE
2. Ve a **Settings** (Cmd/Ctrl + ,)
3. Navega a la sección **Models**

### 2. Habilitar OpenAI API

1. Encuentra la opción **OpenAI API key**
2. Activa el toggle para habilitar la configuración de API personalizada

### 3. Configurar Base URL

Establece la URL base a la URL pública de tu instancia de KeyRouter:

```
https://<tu-hostde-tunel>
```

**Pasos:**
1. En la configuración de Models, localiza el campo **Base URL**
2. Ingresa tu URL pública del túnel (por ejemplo `https://abc123.ngrok.app`)
3. Clic en **Save**

### 4. Agregar API Key

1. En el campo **API Key**, ingresa tu API key de KeyRouter
2. Puedes encontrar tu API key en el dashboard de KeyRouter en **Settings → API Keys**
3. Clic en **Save**

### 5. Agregar modelo personalizado

1. Clic en el botón **View All Models**
2. Clic en **Add Custom Model**
3. Ingresa el nombre del modelo desde tu configuración de KeyRouter (ej. `gpt-4`, `claude-opus-4-5`, etc.)
4. Clic en **Add**

### 6. Seleccionar modelo

1. En la interfaz de chat de Cursor, clic en el dropdown selector de modelo
2. Elige tu modelo personalizado de la lista
3. ¡Empieza a usar KeyRouter con Cursor!

## Ejemplo de configuración

Tu configuración de Cursor debería verse así:

```
OpenAI API: ✓ Enabled
Base URL: https://<tu-host-de-tunel>
API Key: sk-keyrouter-xxxxxxxxxxxxx
Custom Models: gpt-4, claude-opus-4-5, gemini-2.0-flash
```

## Modelos disponibles

Puedes usar cualquier modelo configurado en tu dashboard de KeyRouter. Ejemplos comunes:

| Nombre del modelo | Proveedor | Descripción |
|------------|----------|-------------|
| `gpt-4` | OpenAI | GPT-4 Turbo |
| `gpt-4o` | OpenAI | GPT-4 Optimized |
| `claude-opus-4-5` | Anthropic | Claude Opus 4.5 |
| `claude-sonnet-4-5` | Anthropic | Claude Sonnet 4.5 |
| `gemini-2.0-flash` | Google | Gemini 2.0 Flash |

## Uso

### Interfaz de chat

1. Abre el chat de Cursor (Cmd/Ctrl + L)
2. Selecciona tu modelo del dropdown
3. Comienza a chatear con IA a través de KeyRouter

### Generación de código inline

1. Selecciona código en tu editor
2. Presiona Cmd/Ctrl + K
3. Ingresa tu prompt
4. Cursor usará KeyRouter para generar código

### Explicación de código

1. Selecciona código en tu editor
2. Presiona Cmd/Ctrl + L
3. Pregunta "Explain this code"
4. Obtén explicaciones potenciadas por IA a través de KeyRouter

## Solución de problemas

### Error "Invalid API Key"

1. Verifica tu API key en el dashboard de KeyRouter
2. Asegúrate de haber copiado la key completa incluyendo el prefijo `sk-keyrouter-`
3. Verifica que la API key no haya expirado
4. Intenta regenerar una nueva API key

### Error "Model Not Found"

1. Verifica que el nombre del modelo coincida exactamente con tu configuración de KeyRouter
2. Verifica que la conexión del proveedor esté activa en el dashboard de KeyRouter
3. Asegúrate de que el modelo esté disponible en tus proveedores conectados
4. Intenta usar el nombre completo del modelo (ej. `openai/gpt-4` en lugar de `gpt-4`)

### Problemas de conexión

1. Verifica que estés usando tu URL pública del túnel (por ejemplo `https://abc123.ngrok.app`)
2. Verifica tu conexión a internet
3. Asegúrate de que tu instancia de KeyRouter sea accesible en esa URL pública
4. Intenta deshabilitar VPN o proxy si está habilitado

### Localhost no funciona

> **Recuerda**: Cursor no soporta endpoints `localhost`. Expón tu instancia local de KeyRouter con un túnel (por ejemplo ngrok o cloudflared) y usa la URL pública HTTPS resultante como URL base.

## Configuración de túnel

Si estás ejecutando KeyRouter localmente y quieres usarlo con Cursor:

1. Inicia un túnel que exponga tu puerto local de KeyRouter a internet:
   ```bash
   # ejemplo con ngrok
   ngrok http 20131
   ```
   o con cloudflared:
   ```bash
   cloudflared tunnel --url http://localhost:20131
   ```
2. Copia la URL pública HTTPS que imprima el túnel (por ejemplo `https://abc123.ngrok.app`)
3. Usa esa URL pública como Base URL en la configuración de Cursor
4. Mantén tanto el túnel como KeyRouter en ejecución mientras usas Cursor

## Mejores prácticas

1. **Usa aliases de modelos**: Crea aliases cortos para modelos usados con frecuencia en KeyRouter
2. **Monitorea el uso**: Revisa el dashboard de KeyRouter para estadísticas de uso y costos
3. **Rota las API Keys**: Rota tus API keys regularmente por seguridad
4. **Prueba modelos**: Prueba diferentes modelos para encontrar el mejor para tu caso de uso

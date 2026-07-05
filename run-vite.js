import { build, createServer } from 'vite';

async function run() {
  try {
    const server = await createServer({
      // any valid user config options, plus `mode` and `configFile`
      configFile: './vite.config.ts',
      root: process.cwd(),
      server: {
        port: 1337
      }
    })
    await server.listen()
    server.printUrls()
    console.log('Server started successfully!')
  } catch (e) {
    console.error('Error starting server:', e)
    process.exit(1)
  }
}

run();

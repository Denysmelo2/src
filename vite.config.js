import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig, loadEnv } from 'vite';

const isDev = process.env.NODE_ENV !== 'production';
let inlineEditPlugin, editModeDevPlugin;

if (isDev) {
	inlineEditPlugin = (await import('./plugins/visual-editor/vite-plugin-react-inline-editor.js')).default;
	editModeDevPlugin = (await import('./plugins/visual-editor/vite-plugin-edit-mode.js')).default;
}

// The "Horizons" builder used to inject four inline scripts here
// (window.onerror, console.error and fetch wrappers, a Vite-overlay
// watcher) into EVERY build, production included. They posted every
// console error and failed-fetch body to window.parent with target '*'
// and were the only inline scripts on the page, so they also stood in
// the way of a strict Content-Security-Policy. Removed 2026-10-17.

// Production build on Vercel: stop the build, so the live site keeps the
// previous deploy, rather than ship a site that silently lost a setting.
// Until 08/11/2026 a committed .env.local supplied these values, and its
// localhost VITE_SITE_URL broke the password-reset link. The file is no
// longer in the repository (handover 08/11 "tarde", task B), so the Vercel
// project's Production variables must hold them.
if (process.env.VERCEL_ENV === 'production') {
	const env = loadEnv('production', process.cwd(), 'VITE_');
	const problems = [];
	// Without it the sign-in forms show no captcha, and Supabase refuses
	// them once captcha protection is on.
	if (!String(env.VITE_HCAPTCHA_SITE_KEY || '').trim()) {
		problems.push('VITE_HCAPTCHA_SITE_KEY is not set');
	}
	if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/]|$)/i.test(String(env.VITE_SITE_URL || '').trim())) {
		problems.push(`VITE_SITE_URL points at this machine (${env.VITE_SITE_URL})`);
	}
	if (problems.length) {
		throw new Error(
			`Production build stopped: ${problems.join('; ')}. ` +
				'Set it in Vercel → Project → Settings → Environment Variables (Production) and redeploy.'
		);
	}
}

console.warn = () => {};

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
	if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		return;
	}

	loggerError(msg, options);
}

export default defineConfig({
	customLogger: logger,
	plugins: [
		...(isDev ? [inlineEditPlugin(), editModeDevPlugin()] : []),
		react(),
	],
	server: {
		cors: true,
		headers: {
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
		allowedHosts: true,
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json', ],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		rollupOptions: {
			external: [
				'@babel/parser',
				'@babel/traverse',
				'@babel/generator',
				'@babel/types'
			]
		}
	}
});

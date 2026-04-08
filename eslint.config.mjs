import nextConfig from "eslint-config-next";

const config = [
	{
		ignores: [".next/**", ".next-dev/**", "out/**", "build/**", "node_modules/**"],
	},
	...nextConfig,
	{
		rules: {
			"react-hooks/set-state-in-effect": "off",
		},
	},
];

export default config;

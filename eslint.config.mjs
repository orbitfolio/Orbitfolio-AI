import nextVitals from "eslint-config-next/core-web-vitals";
import pluginSecurity from "eslint-plugin-security";

const eslintConfig = [
  ...nextVitals,
  pluginSecurity.configs.recommended,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scripts/**",
      ".tmp-tests/**",
    ],
  }
];

export default eslintConfig;

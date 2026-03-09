module.exports = {
  apps: [
    {
      name: "world-inference-frontend",
      cwd: "/www/wwwroot/world-inference/frontend",
      script: "npm",
      args: "run start -- --hostname 127.0.0.1 --port 3000",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};

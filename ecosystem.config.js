module.exports = {
  apps: [
    {
      name: 'invoice-printer',
      script: './build/index.js',
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      watch: ['build'],
      max_restarts: 10,
      restart_delay: 5000,
      watch_delay: 5000,
    },
  ],
};

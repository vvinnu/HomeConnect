const sql = require('mssql/msnodesqlv8'); // 👈 correct driver for Windows Auth

const config = {
  database: 'HomeConnect',
  server: 'localhost',
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ Connected to SQL Server with Windows Auth');
    return pool;
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

module.exports = {
  sql,
  poolPromise
};

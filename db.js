const Pool= require("pg").Pool;

const pool= new Pool({
  user:"postgres",
  password:"Mindkiller1",
  host:"localhost",
  port: 5432,
  database: "bagholder"
});

module.exports=pool;

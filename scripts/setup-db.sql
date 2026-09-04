-- Crear usuario qa_user si no existe
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'qa_user') THEN
      CREATE USER qa_user WITH PASSWORD 'qa_password' CREATEDB;
   END IF;
END
$$;

-- Crear base de datos qa_saas_db si no existe
SELECT 'CREATE DATABASE qa_saas_db OWNER qa_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qa_saas_db')\gexec

-- Dar privilegios
GRANT ALL PRIVILEGES ON DATABASE qa_saas_db TO qa_user;
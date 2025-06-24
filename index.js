const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const { Client } = require('ssh2');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());

const sshConfig = {
  host: '3.123.108.219',
  port: 22,
  username: 'ubuntu',
  privateKey: fs.readFileSync('./eazyman.pem')
};

const dbConfig = {
  user: 'eazymanadmin',
  password: 'ewitdVVr6M9NEDPw6MX6',
  //database: ' '  
};

const sshClient = new Client();

sshClient.on('ready', () => {
  console.log('SSH connection established.');

  sshClient.forwardOut(
    '127.0.0.1', 12345,
    'eazyman-database.cd2kuw8gu592.eu-central-1.rds.amazonaws.com', 3306,
    (err, stream) => {
      if (err) {
        console.error('Error forwarding connection:', err);
        return;
      }

      const connection = mysql.createConnection({
        ...dbConfig,
        stream: stream
      });

      connection.connect((err) => {
        if (err) {
          console.error('MySQL connection error:', err);
          return;
        }
        console.log('Connected to MySQL via SSH tunnel.');

        // Example endpoint
        app.get('/employees', (req, res) => {
          const query = `
    SELECT 
            s.school_name AS SCHOOL_NAME,
      a.year AS ACADEMIC_YEAR,
      COUNT(DISTINCT t.id) AS STUDENT_COUNT
    FROM 
      eazyman_community.sm_schools s
    LEFT JOIN 
      eazyman_community.sm_academic_years a 
        ON s.id = a.school_id AND a.year = YEAR(CURDATE())
    LEFT JOIN 
      eazyman_community.sm_students t 
        ON t.school_id = s.id AND t.academic_id = a.id
    LEFT JOIN 
      eazyman_community.sm_class_allocations c 
        ON c.student_id = t.id AND c.active_status = 1
    GROUP BY 
      s.id, s.school_name, a.year
    ORDER BY 
      s.school_name;
  `;

          connection.query(query, (err, results) => {
            if (err) {
              res.status(500).json({ error: 'Database error', details: err });
              return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.json(results);
          });
        });



        app.listen(port, () => {
          console.log(`API server running at http://localhost:${port}`);
        });
      });
    }
  );
}).connect(sshConfig);

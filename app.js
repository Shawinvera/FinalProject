const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); 
const path = require('path'); 

const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = 5000;

app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Define routes to serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/land-listing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'land-listing.html'));
});

// Connect to MySQL database
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

// Register route
app.post('/register', (req, res) => {
    console.log(req.body); // Log request body for debugging
    const { username, password, email, role } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const sql = 'INSERT INTO Accounts (username, password, email, role) VALUES (?, ?, ?, ?)';
        db.query(sql, [username, hash, email, role], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully!' });
        });
    });
});


// Login route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM Accounts WHERE email = ?';
    db.query(sql, [email], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = results[0];

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;

        if (!isMatch) {
          return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate a token
        const token = jwt.sign({ id: user.id, role: user.role }, 'your_jwt_secret', { expiresIn: '1h' });

        res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
      });
    });
});

app.post('/land', (req, res) => {
    const { title, description, location, acres, price, seller_id } = req.body;
  
    const sql = 'INSERT INTO land_listings (title, description, location, acres, price, seller_id) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [title, description, location, acres, price, seller_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'Land listing added successfully!' });
    });
});
  
app.get('/land', (req, res) => {
    const sql = 'SELECT * FROM land_listings WHERE is_available = TRUE';
    db.query(sql, (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
});

app.post('/purchase', (req, res) => {
    const { land_id, buyer_id } = req.body;
  
    const sql = 'UPDATE land_listings SET is_available = FALSE WHERE id = ?';
    db.query(sql, [land_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Land purchased successfully!' });
    });
});
  
app.put('/land/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, location, acres, price, is_available, seller_id } = req.body;
  
    const sql = `UPDATE land_listings 
                 SET title = ?, description = ?, location = ?, acres = ?, price = ?, is_available = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ? AND seller_id = ?`;
  
    db.query(sql, [title, description, location, acres, price, is_available, id, seller_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Land listing not found or you do not have permission to update this listing.' });
      }
      res.json({ message: 'Land listing updated successfully!' });
    });
});

app.delete('/land/:id', (req, res) => {
    const { id } = req.params;
    const { seller_id } = req.body;
  
    const sql = `DELETE FROM land_listings WHERE id = ? AND seller_id = ?`;
  
    db.query(sql, [id, seller_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Land listing not found or you do not have permission to delete this listing.' });
      }
      res.json({ message: 'Land listing deleted successfully!' });
    });
});
  
app.get('/my-land/:seller_id', (req, res) => {
    const { seller_id } = req.params;
  
    const sql = `SELECT * FROM land_listings WHERE seller_id = ?`;
  
    db.query(sql, [seller_id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
});
  
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

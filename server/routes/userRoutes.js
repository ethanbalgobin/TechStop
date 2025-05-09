const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 

const pool = require('../db')
const authenticateToken = require('../middleware/authenticateToken');

const SALT_ROUNDS = 10; 

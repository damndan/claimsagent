import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import HomePage from './pages/HomePage';
import ClaimPage from './pages/ClaimPage';

const App: React.FC = () => {
  return (
    <Router>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" elevation={2}>
          <Toolbar>
            <Button
              component={Link}
              to="/"
              sx={{
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                  color: 'white',
                  textDecoration: 'none',
                }}
              >
                Claims Agent Portal
              </Typography>
            </Button>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/claim/:id" element={<ClaimPage />} />
          </Routes>
        </Container>
      </Box>
    </Router>
  );
};

export default App;

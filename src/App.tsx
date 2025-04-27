import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import HomePage from './pages/HomePage';
import ClaimPage from './pages/ClaimPage';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="error">
            Something went wrong
          </Typography>
          <Typography variant="body1">
            {this.state.error?.message}
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Reload Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link } from 'react-router-dom';
import { Claim } from '../types/claim';
import { claimService } from '../services/claimService';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newClaimData, setNewClaimData] = useState<Partial<Claim>>({
    customerName: '',
    description: ''
  });

  useEffect(() => {
    // Load claims from storage on component mount
    const loadedClaims = claimService.getAllClaims();
    setClaims(loadedClaims);
  }, []);

  const generateClaimId = () => {
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.random().toString(36).substr(2, 4).toUpperCase(); // 4 random alphanumeric chars
    return `CLM-${timestamp}-${random}`;
  };

  const handleCreateClaim = () => {
    if (!newClaimData.customerName || !newClaimData.description) return;

    const newClaim: Claim = {
      id: generateClaimId(),
      customerName: newClaimData.customerName,
      date: new Date().toISOString(),
      status: 'New',
      description: newClaimData.description,
      mediaFiles: [],
      summary: '',
      assessment: '',
      submitted: false
    };

    claimService.saveClaim(newClaim);
    setClaims([...claims, newClaim]);
    setNewClaimData({ customerName: '', description: '' });
    setOpenDialog(false);
  };

  const handleDeleteClaim = (id: string) => {
    claimService.deleteClaim(id);
    setClaims(claims.filter(claim => claim.id !== id));
  };

  const getStatusColor = (status: Claim['status']) => {
    switch (status) {
      case 'New':
        return 'info';
      case 'In Progress':
        return 'warning';
      case 'Completed':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1">
            Claims Dashboard
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            New Claim
          </Button>
        </Stack>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Claim ID</TableCell>
                <TableCell>Customer Name</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell>{claim.id}</TableCell>
                  <TableCell>{claim.customerName}</TableCell>
                  <TableCell>{new Date(claim.date).toLocaleDateString()}</TableCell>
                  <TableCell>{claim.description}</TableCell>
                  <TableCell>
                    {claim.submitted ? (
                      <Chip
                        label={`Submitted ${new Date(claim.submittedAt!).toLocaleDateString()}`}
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        label="Not Submitted"
                        color="default"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      component={Link}
                      to={`/claim/${claim.id}`}
                      sx={{
                        '&:disabled': {
                          borderColor: 'rgba(0, 0, 0, 0.12)',
                          color: 'rgba(0, 0, 0, 0.26)',
                        },
                      }}
                    >
                      {claim.submitted ? 'View' : 'Edit'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Create New Claim</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Customer Name"
                value={newClaimData.customerName}
                onChange={(e) => setNewClaimData({ ...newClaimData, customerName: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={newClaimData.description}
                onChange={(e) => setNewClaimData({ ...newClaimData, description: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateClaim}
              disabled={!newClaimData.customerName || !newClaimData.description}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default HomePage; 
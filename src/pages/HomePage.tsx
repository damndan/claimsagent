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
  Tabs,
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Link } from 'react-router-dom';
import { Claim } from '../types/claim';
import { claimService } from '../services/claimService';
import { UserRole } from '../types/user';
import ApproverView from '../components/ApproverView';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SubmitterView: React.FC<{ claims: Claim[], onClaimUpdate: (updatedClaim: Claim) => void }> = ({ claims, onClaimUpdate }) => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const [newClaimData, setNewClaimData] = useState<Partial<Claim>>({
    customerName: '',
    description: ''
  });

  // Filter out completed claims
  const activeClaims = claims.filter(claim => claim.status !== 'Completed' && !claim.submitted);

  const generateClaimId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
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
      submitted: false,
      submittedAt: undefined,
      approvedAt: undefined,
      rejectedAt: undefined
    };

    onClaimUpdate(newClaim);
    setNewClaimData({ customerName: '', description: '' });
    setOpenDialog(false);
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
      case 'Pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1">
            My Claims
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
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell>{claim.id}</TableCell>
                  <TableCell>{claim.customerName}</TableCell>
                  <TableCell>{new Date(claim.date).toLocaleDateString()}</TableCell>
                  <TableCell>{claim.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={claim.submitted ? 'Pending' : claim.status}
                      color={getStatusColor(claim.submitted ? 'Pending' : claim.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      component={Link}
                      to={`/claim/${claim.id}`}
                    >
                      Edit
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

const HomePage: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole>('submitter');
  const [tabValue, setTabValue] = useState(0);
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    const loadedClaims = claimService.getAllClaims();
    setClaims(loadedClaims);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleClaimUpdate = (updatedClaim: Claim) => {
    claimService.saveClaim(updatedClaim);
    // Check if this is a new claim or an update to an existing one
    const existingClaimIndex = claims.findIndex(c => c.id === updatedClaim.id);
    if (existingClaimIndex === -1) {
      // It's a new claim, add it to the list
      setClaims([...claims, updatedClaim]);
    } else {
      // It's an update to an existing claim
      setClaims(claims.map(c => c.id === updatedClaim.id ? updatedClaim : c));
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="basic tabs example">
          <Tab label="My Claims" />
          <Tab label="Claims for Approval" />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        <SubmitterView claims={claims} onClaimUpdate={handleClaimUpdate} />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <ApproverView claims={claims} onClaimUpdate={handleClaimUpdate} />
      </TabPanel>
    </Box>
  );
};

export default HomePage; 
import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  TextField
} from '@mui/material';
import { Claim } from '../types/claim';
import { llmService } from '../services/llmService';

interface ApproverViewProps {
  claims: Claim[];
  onClaimUpdate: (updatedClaim: Claim) => void;
}

const ApproverView: React.FC<ApproverViewProps> = ({ claims, onClaimUpdate }) => {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [qualityReview, setQualityReview] = useState('');
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [editedAssessment, setEditedAssessment] = useState('');
  const [editedQualityReview, setEditedQualityReview] = useState('');

  useEffect(() => {
    if (selectedClaim) {
      setEditedAssessment(selectedClaim.assessment || '');
      setEditedQualityReview(qualityReview);
    }
  }, [selectedClaim, qualityReview]);

  const handleAssessmentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedAssessment(e.target.value);
    if (selectedClaim) {
      const updatedClaim = {
        ...selectedClaim,
        assessment: e.target.value
      };
      onClaimUpdate(updatedClaim);
    }
  };

  const handleQualityReviewChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedQualityReview(e.target.value);
  };

  const handleGenerateQualityReview = async () => {
    if (!selectedClaim) return;
    
    setIsGeneratingReview(true);
    try {
      const response = await llmService.generateQualityReview(selectedClaim.assessment);
      if (response.error) {
        console.error('Error generating quality review:', response.error);
      } else {
        setQualityReview(response.text);
      }
    } catch (error) {
      console.error('Error generating quality review:', error);
    } finally {
      setIsGeneratingReview(false);
    }
  };

  const handleApprove = (claim: Claim) => {
    const updatedClaim: Claim = {
      ...claim,
      status: 'Completed',
      approvedAt: new Date().toISOString(),
      submitted: false
    };
    onClaimUpdate(updatedClaim);
    setOpenDialog(false);
  };

  const handleReject = (claim: Claim) => {
    const updatedClaim: Claim = {
      ...claim,
      status: 'Rejected',
      rejectedAt: new Date().toISOString(),
      submitted: false
    };
    onClaimUpdate(updatedClaim);
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

  const submittedClaims = claims.filter(claim => claim.submitted);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
          Claims for Approval
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Claim ID</TableCell>
                <TableCell>Customer Name</TableCell>
                <TableCell>Date Submitted</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assessment</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submittedClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell>{claim.id}</TableCell>
                  <TableCell>{claim.customerName}</TableCell>
                  <TableCell>{new Date(claim.submittedAt!).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={claim.submitted ? 'Pending' : claim.status}
                      color={getStatusColor(claim.submitted ? 'Pending' : claim.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {claim.assessment ? (
                      <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {claim.assessment}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No assessment yet
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setSelectedClaim(claim);
                        setOpenDialog(true);
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Review Claim</DialogTitle>
          <DialogContent>
            {selectedClaim && (
              <Box sx={{ pt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Claim Details
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Claim ID:</strong> {selectedClaim.id}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Customer:</strong> {selectedClaim.customerName}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Description:</strong> {selectedClaim.description}
                </Typography>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Assessment
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={editedAssessment}
                    onChange={handleAssessmentChange}
                    placeholder="Enter assessment..."
                    variant="outlined"
                  />
                </Paper>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Quality Review</Typography>
                  <Button
                    variant="outlined"
                    onClick={handleGenerateQualityReview}
                    disabled={!selectedClaim.assessment || isGeneratingReview}
                    startIcon={isGeneratingReview ? <CircularProgress size={20} /> : null}
                  >
                    {isGeneratingReview ? 'Generating...' : 'Generate Quality Review'}
                  </Button>
                </Box>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={editedQualityReview}
                    onChange={handleQualityReviewChange}
                    placeholder="Enter quality review..."
                    variant="outlined"
                  />
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => selectedClaim && handleReject(selectedClaim)}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => selectedClaim && handleApprove(selectedClaim)}
            >
              Approve
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ApproverView; 
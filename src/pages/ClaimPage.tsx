import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button,
  TextField,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Alert,
  Snackbar,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { claimService } from '../services/claimService';
import { fileStorage } from '../services/fileStorage';
import { Claim, MediaFile } from '../types/claim';
import { llmService } from '../services/llmService';
import frontEndCrash from '../assets/front-end-crash.jpg';
import sideImpactCrash from '../assets/side-impact-crash.jpg';
import rearEndCrash from '../assets/rear-end-crash.jpg';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

// Function to compress image
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions to a reasonable size (e.g., max 800px width/height)
        const maxDimension = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to JPEG with 0.7 quality
          const compressedData = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedData);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const ClaimPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const [assessment, setAssessment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaAssessment, setMediaAssessment] = useState('');
  const [summaryAssessment, setSummaryAssessment] = useState('');
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showComparables, setShowComparables] = useState(false);

  useEffect(() => {
    if (id) {
      const loadClaim = async () => {
        const loadedClaim = claimService.getClaimById(id);
        if (loadedClaim) {
          setClaim(loadedClaim);
          setMediaFiles(loadedClaim.mediaFiles || []);
          setSummary(loadedClaim.summary || '');
          setAssessment(loadedClaim.assessment || '');

          // Load file previews from IndexedDB
          const previews: Record<string, string> = {};
          for (const file of loadedClaim.mediaFiles || []) {
            const data = await fileStorage.getFile(file.id);
            if (data) {
              previews[file.id] = data;
            }
          }
          setFilePreviews(previews);
        }
        setIsLoading(false);
      };
      loadClaim();
    }
  }, [id]);

  const saveClaim = () => {
    if (claim) {
      const updatedClaim = {
        ...claim,
        mediaFiles,
        summary,
        assessment
      };
      claimService.saveClaim(updatedClaim);
      setClaim(updatedClaim);
    }
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newMediaFiles: MediaFile[] = [];
      const newPreviews: Record<string, string> = {};
      
      for (const file of Array.from(files)) {
        try {
          let compressedData: string;
          
          if (file.type.startsWith('image/')) {
            // Compress images
            compressedData = await compressImage(file);
          } else {
            // For videos, just store the file data directly
            compressedData = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
          }
          
          const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const mediaFile: MediaFile = {
            id: fileId,
            name: file.name,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            size: file.size,
            lastModified: file.lastModified
          };
          
          // Save file data to IndexedDB
          await fileStorage.saveFile(fileId, compressedData);
          
          newMediaFiles.push(mediaFile);
          newPreviews[fileId] = compressedData;
        } catch (error) {
          console.error('Error processing file:', error);
        }
      }
      
      const updatedMediaFiles = [...mediaFiles, ...newMediaFiles];
      setMediaFiles(updatedMediaFiles);
      setFilePreviews(prev => ({ ...prev, ...newPreviews }));
      
      if (claim) {
        const updatedClaim = {
          ...claim,
          mediaFiles: updatedMediaFiles
        };
        claimService.saveClaim(updatedClaim);
        setClaim(updatedClaim);
      }
    }
  };

  const handleDeleteMedia = async (id: string) => {
    const updatedMediaFiles = mediaFiles.filter(file => file.id !== id);
    setMediaFiles(updatedMediaFiles);
    
    // Remove file data from IndexedDB
    await fileStorage.deleteFile(id);
    
    // Remove preview
    setFilePreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[id];
      return newPreviews;
    });
    
    if (claim) {
      const updatedClaim = {
        ...claim,
        mediaFiles: updatedMediaFiles
      };
      claimService.saveClaim(updatedClaim);
      setClaim(updatedClaim);
    }
  };

  const handleMediaClick = (media: MediaFile) => {
    setSelectedMedia(media);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMedia(null);
  };

  const handleGenerateMediaAssessment = async () => {
    if (!mediaFiles.length) {
      setSnackbarMessage('Please upload at least one media file');
      setSnackbarOpen(true);
      return;
    }

    setIsGeneratingMedia(true);
    try {
      const response = await llmService.generateMediaAssessment(mediaFiles);
      if (response.error) {
        setSnackbarMessage(response.error);
        setSnackbarOpen(true);
      } else {
        setMediaAssessment(response.text);
      }
    } catch (error) {
      setSnackbarMessage('Error generating media assessment');
      setSnackbarOpen(true);
    } finally {
      setIsGeneratingMedia(false);
    }
  };

  const handleGenerateSummaryAssessment = async () => {
    if (!summary.trim()) {
      setSnackbarMessage('Please provide a damage summary');
      setSnackbarOpen(true);
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const response = await llmService.generateSummaryAssessment(summary);
      if (response.error) {
        setSnackbarMessage(response.error);
        setSnackbarOpen(true);
      } else {
        setSummaryAssessment(response.text);
      }
    } catch (error) {
      setSnackbarMessage('Error generating summary assessment');
      setSnackbarOpen(true);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateResponse = async () => {
    if (!mediaFiles.length || !summary) {
      setSnackbarMessage('Please upload media files and provide a summary first');
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await llmService.generateFinalAssessment(mediaFiles, summary);
      if (response.error) {
        setSnackbarMessage(response.error);
        setSnackbarOpen(true);
      } else {
        setAssessment(response.text);
        if (claim) {
          const updatedClaim = {
            ...claim,
            assessment: response.text
          };
          claimService.saveClaim(updatedClaim);
          setClaim(updatedClaim);
        }
      }
    } catch (error) {
      setSnackbarMessage('Error generating final assessment');
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSummary = e.target.value;
    setSummary(newSummary);
    if (claim) {
      const updatedClaim = {
        ...claim,
        summary: newSummary
      };
      claimService.saveClaim(updatedClaim);
      setClaim(updatedClaim);
    }
  };

  const handleAssessmentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newAssessment = e.target.value;
    setAssessment(newAssessment);
    if (claim) {
      const updatedClaim = {
        ...claim,
        assessment: newAssessment
      };
      claimService.saveClaim(updatedClaim);
      setClaim(updatedClaim);
    }
  };

  const handleSubmitClaim = () => {
    if (!claim) return;
    
    // Validate required fields
    if (!mediaFiles.length) {
      setSnackbarMessage('Please upload at least one media file');
      setSnackbarOpen(true);
      return;
    }
    
    if (!summary.trim()) {
      setSnackbarMessage('Please provide a damage summary');
      setSnackbarOpen(true);
      return;
    }
    
    if (!assessment.trim()) {
      setSnackbarMessage('Please generate or provide an assessment');
      setSnackbarOpen(true);
      return;
    }

    const updatedClaim = {
      ...claim,
      status: 'Completed' as const,
      submitted: true,
      submittedAt: new Date().toISOString()
    };

    claimService.saveClaim(updatedClaim);
    setClaim(updatedClaim);
    setSnackbarMessage('Claim submitted successfully!');
    setSnackbarOpen(true);
    
    // Navigate back to home page after a short delay
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!claim) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Claim not found
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'nowrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
            <Button
              component={Link}
              to="/"
              startIcon={<ArrowBackIcon />}
              sx={{
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              Back to Portal
            </Button>
            <Typography 
              variant="h4" 
              component="h1"
              sx={{ 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              Claim #{id} - Damage Assessment
            </Typography>
          </Box>
          {!claim?.submitted && (
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmitClaim}
              startIcon={<SendIcon />}
              disabled={!mediaFiles.length || !summary || !assessment}
              sx={{ flexShrink: 0, ml: 2 }}
            >
              Submit to Adjuster
            </Button>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Media Upload Section */}
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Vehicle Damage Media
              </Typography>
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                sx={{ mb: 2 }}
              >
                Upload Media
                <VisuallyHiddenInput 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*,video/*" 
                  multiple 
                  onChange={handleMediaUpload} 
                />
              </Button>
              
              {/* Media Gallery */}
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)'
                },
                gap: 2,
                mt: 2
              }}>
                {mediaFiles.map((media) => (
                  <Box
                    key={media.id}
                    sx={{
                      position: 'relative',
                      cursor: 'pointer',
                      '&:hover .media-overlay': {
                        opacity: 1,
                      },
                    }}
                  >
                    {media.type === 'image' ? (
                      <img
                        src={filePreviews[media.id]}
                        alt={media.name}
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                        }}
                        onClick={() => handleMediaClick(media)}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '200px',
                          bgcolor: 'black',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                        }}
                        onClick={() => handleMediaClick(media)}
                      >
                        <PlayArrowIcon sx={{ fontSize: 48, color: 'white' }} />
                      </Box>
                    )}
                    <Box
                      className="media-overlay"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMedia(media.id);
                        }}
                        sx={{ color: 'white' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>

          {/* Summary Editor Section */}
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Damage Summary
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={10}
                value={summary}
                onChange={handleSummaryChange}
                placeholder="Enter damage description..."
                variant="outlined"
              />
            </Paper>
          </Box>
        </Box>

        {/* Media Assessment Section */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Media Analysis</Typography>
            <Button
              variant="outlined"
              onClick={handleGenerateMediaAssessment}
              disabled={!mediaFiles.length || isGeneratingMedia || claim?.submitted}
              startIcon={isGeneratingMedia ? <CircularProgress size={20} /> : null}
            >
              {isGeneratingMedia ? 'Analyzing...' : 'Analyze Media'}
            </Button>
          </Box>
          {mediaAssessment && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                  {mediaAssessment}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Paper>

        {/* Summary Assessment Section */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Summary Analysis</Typography>
            <Button
              variant="outlined"
              onClick={handleGenerateSummaryAssessment}
              disabled={!summary.trim() || isGeneratingSummary || claim?.submitted}
              startIcon={isGeneratingSummary ? <CircularProgress size={20} /> : null}
            >
              {isGeneratingSummary ? 'Analyzing...' : 'Analyze Summary'}
            </Button>
          </Box>
          {summaryAssessment && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                  {summaryAssessment}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Paper>

        {/* Comparable Accidents Section */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Comparable Accidents</Typography>
            <Button
              variant="outlined"
              onClick={() => setShowComparables(!showComparables)}
              disabled={!mediaFiles.length || claim?.submitted}
            >
              {showComparables ? 'Hide Comparables' : 'Find More Comparables'}
            </Button>
          </Box>
          {showComparables && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Comparable 1 */}
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box sx={{ flex: 1, minWidth: 300 }}>
                      <img
                        src={frontEndCrash}
                        alt="Front-end collision damage"
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Similar Front-End Collision
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        • 2021 Honda Accord<br />
                        • Similar impact point and damage pattern<br />
                        • Repair cost: $4,200<br />
                        • Settlement amount: $4,800<br />
                        • Resolution time: 7 days
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Comparable 2 */}
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box sx={{ flex: 1, minWidth: 300 }}>
                      <img
                        src={sideImpactCrash}
                        alt="Side impact damage"
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Similar Side Impact
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        • 2020 Toyota Camry<br />
                        • Comparable structural damage<br />
                        • Repair cost: $5,100<br />
                        • Settlement amount: $5,600<br />
                        • Resolution time: 9 days
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Comparable 3 */}
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box sx={{ flex: 1, minWidth: 300 }}>
                      <img
                        src={rearEndCrash}
                        alt="Rear-end collision damage"
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Similar Rear-End Collision
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        • 2019 Honda Civic<br />
                        • Similar bumper and trunk damage<br />
                        • Repair cost: $3,800<br />
                        • Settlement amount: $4,200<br />
                        • Resolution time: 6 days
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </Paper>

        {/* Final Assessment Section */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Final Assessment</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateResponse}
              disabled={!mediaFiles.length || !summary || claim?.submitted}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Generating...' : 'Generate Final Assessment'}
            </Button>
          </Box>
          {assessment && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                  {assessment}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Paper>

        {/* Generate Response Button */}
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateResponse}
            disabled={!mediaFiles.length || !summary || claim?.submitted}
            sx={{ mb: 3 }}
          >
            Generate Assessment
          </Button>
        </Stack>

        {claim?.submitted && (
          <Alert severity="success" sx={{ mt: 2 }}>
            This claim was submitted on {new Date(claim.submittedAt!).toLocaleDateString()} at{' '}
            {new Date(claim.submittedAt!).toLocaleTimeString()}
          </Alert>
        )}

        {/* Media Preview Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedMedia?.name}
          </DialogTitle>
          <DialogContent>
            {selectedMedia?.type === 'image' ? (
              <img
                src={filePreviews[selectedMedia.id]}
                alt={selectedMedia.name}
                style={{ width: '100%', height: 'auto' }}
              />
            ) : (
              <video
                controls
                style={{ width: '100%', height: 'auto' }}
              >
                {selectedMedia && (
                  <source src={filePreviews[selectedMedia.id]} type="video/mp4" />
                )}
                Your browser does not support the video tag.
              </video>
            )}
          </DialogContent>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          message={snackbarMessage}
        />
      </Box>
    </Container>
  );
};

export default ClaimPage; 
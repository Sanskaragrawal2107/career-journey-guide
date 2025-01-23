const handleFileUpload = async (file: File) => {
  if (!file) return;

  if (file.type !== 'application/pdf') {
    toast({
      title: "Error",
      description: "Please upload a PDF file",
      variant: "destructive",
    });
    return;
  }

  setLoading(true);
  try {
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    console.log('Uploading file:', fileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload file to storage');
    }

    // Get the public URL of the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);

    // Create FormData to send file URL to Make.com
    const formData = new FormData();
    formData.append('fileUrl', publicUrl);
    formData.append('fileName', file.name);

    // Send file URL to Make.com webhook
    const response = await fetch('https://hook.eu2.make.com/mbwx1e992a7xe5j3aur164vyb63pfji3', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('Make.com response error:', response.statusText);
      throw new Error('Failed to process resume');
    }

    toast({
      title: "Success",
      description: "Resume uploaded successfully",
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    toast({
      title: "Error",
      description: error.message || "Failed to upload resume",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

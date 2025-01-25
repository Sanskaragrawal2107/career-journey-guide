import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Loader2, Trash2, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Resume {
  id: string;
  file_path: string;
  created_at: string;
  drive_file_url: string | null;
  analysis_result: {
    optimized_content?: string;
  } | null;
}

export function ResumeManager() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const { data: resumes = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        console.log('Fetching resumes for user:', user.id);
        const { data, error } = await supabase
          .from('resumes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching resumes:', error);
          throw error;
        }
        
        console.log('Raw resumes data:', data);
        console.log('Resume drive_file_urls:', data?.map(r => ({ id: r.id, url: r.drive_file_url })));
        
        return (data || []).map(item => ({
          id: item.id,
          file_path: item.file_path,
          created_at: item.created_at,
          drive_file_url: item.drive_file_url,
          analysis_result: item.analysis_result as { optimized_content?: string } | null
        }));
      } catch (error) {
        console.error('Error in queryFn:', error);
        toast({
          title: "Error",
          description: "Failed to fetch resumes",
          variant: "destructive",
        });
        return [];
      }
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  async function ensureProfileExists(userId: string, userEmail: string) {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select()
      .eq('id', userId)
      .single();

    if (!profile) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
        });

      if (insertError) throw insertError;
    } else if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }
  }

  async function uploadResume(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Starting resume upload for user:', user.id);
      await ensureProfileExists(user.id, user.email || '');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      
      console.log('Uploading file to storage:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      console.log('File uploaded to storage, creating database record');
      const { error: dbError } = await supabase
        .from('resumes')
        .insert({
          file_path: filePath,
          user_id: user.id,
        });

      if (dbError) throw dbError;

      console.log('Resume upload completed successfully');
      toast({
        title: "Success",
        description: "Resume uploaded successfully",
      });

      refetch();
    } catch (error) {
      console.error('Error in uploadResume:', error);
      toast({
        title: "Error",
        description: "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function deleteResume(id: string, filePath: string) {
    try {
      console.log('Deleting resume:', id, filePath);
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('resumes')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      console.log('Resume deleted successfully');
      toast({
        title: "Success",
        description: "Resume deleted successfully",
      });

      refetch(); // Manually refetch after deletion
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast({
        title: "Error",
        description: "Failed to delete resume",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={uploadResume}
          disabled={uploading}
          className="max-w-sm"
        />
        {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      {loading ? (
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : resumes.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resume</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumes.map((resume) => {
              console.log('Rendering resume row:', {
                id: resume.id,
                drive_file_url: resume.drive_file_url,
                created_at: resume.created_at
              });
              return (
                <TableRow key={resume.id}>
                  <TableCell className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Resume {new Date(resume.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{new Date(resume.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {resume.drive_file_url ? 'Optimized' : 'Processing'}
                  </TableCell>
                  <TableCell className="space-x-2">
                    {resume.drive_file_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          console.log('Opening drive file URL:', resume.drive_file_url);
                          window.open(resume.drive_file_url!, '_blank');
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteResume(resume.id, resume.file_path)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center text-muted-foreground">
          No resumes uploaded yet
        </div>
      )}
    </div>
  );
}
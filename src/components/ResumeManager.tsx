import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Loader2, Trash2, Download } from "lucide-react";
import { Document, Packer, Paragraph, TextRun } from "docx";

interface Resume {
  id: string;
  file_path: string;
  created_at: string;
  analysis_result: {
    optimized_content?: string;
  } | null;
}

export function ResumeManager() {
  const [uploading, setUploading] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchResumes();
  }, []);

  async function fetchResumes() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData: Resume[] = (data || []).map(item => ({
        id: item.id,
        file_path: item.file_path,
        created_at: item.created_at,
        analysis_result: item.analysis_result as { optimized_content?: string } | null
      }));

      setResumes(transformedData);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch resumes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

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

      await ensureProfileExists(user.id, user.email || '');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('resumes')
        .insert({
          file_path: filePath,
          user_id: user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Resume uploaded successfully",
      });

      fetchResumes();
    } catch (error) {
      console.error('Error uploading resume:', error);
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
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('resumes')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Resume deleted successfully",
      });

      setResumes(resumes.filter(resume => resume.id !== id));
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast({
        title: "Error",
        description: "Failed to delete resume",
        variant: "destructive",
      });
    }
  }

  const generateAndDownloadDocx = async (content: string, fileName: string) => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun(content)
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.docx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Resume downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Error",
        description: "Failed to generate document",
        variant: "destructive",
      });
    }
  };

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
            {resumes.map((resume) => (
              <TableRow key={resume.id}>
                <TableCell className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resume {new Date(resume.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{new Date(resume.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  {resume.analysis_result?.optimized_content 
                    ? 'Optimized' 
                    : 'Processing'}
                </TableCell>
                <TableCell className="space-x-2">
                  {resume.analysis_result?.optimized_content && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => generateAndDownloadDocx(
                        resume.analysis_result?.optimized_content || '',
                        `optimized_resume_${new Date(resume.created_at).toLocaleDateString()}`
                      )}
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
            ))}
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

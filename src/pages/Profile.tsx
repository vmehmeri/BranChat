import { useState, useRef, useEffect } from 'react';
import { User, Camera, Trash2, X, FolderOpen, Copy } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useChat } from '@/contexts/ChatContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useToast } from '@/hooks/use-toast';
import { clearAllData } from '@/services/database';

const PROFILE_STORAGE_KEY = 'branchat_profile';
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB

export default function Profile() {
  const { clearAllConversations } = useChat();
  const { profile, updateProfile, getInitials } = useUserProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [bio, setBio] = useState(profile.bio);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl);
  const [dataPaths, setDataPaths] = useState<{
    userData: string;
    database: string;
    settings: string;
    blobs: string;
  } | null>(null);

  useEffect(() => {
    const loadDataPaths = async () => {
      if (window.electronAPI?.getDataPaths) {
        const paths = await window.electronAPI.getDataPaths();
        setDataPaths(paths);
      }
    };
    loadDataPaths();
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_SIZE) {
      toast({
        title: 'File too large',
        description: 'Profile photo must be less than 2MB.',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setPhotoUrl(`data:${file.type};base64,${base64}`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to read the image file.',
        variant: 'destructive',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
  };

  const handleSaveChanges = () => {
    updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      bio: bio.trim(),
      photoUrl,
    });

    toast({
      title: 'Profile updated',
      description: 'Your profile has been saved successfully.',
    });
  };

  const handleDeleteAllData = async () => {
    // Clear the database (IndexedDB for web, file for Electron)
    await clearAllData();

    // Clear the profile from localStorage
    localStorage.removeItem(PROFILE_STORAGE_KEY);

    // Clear conversations from context
    clearAllConversations();

    toast({
      title: 'Data deleted',
      description: 'All chat history and data have been permanently deleted.',
    });

    // Reload to reset the app state
    window.location.reload();
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast({
      title: 'Copied',
      description: 'Path copied to clipboard',
    });
  };

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground mt-1">
              Manage your profile
            </p>
          </div>

          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>
                Your private profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={photoUrl || ''} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Profile photo</p>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG or GIF. Max 2MB.
                  </p>
                  {photoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 px-2 text-destructive hover:text-destructive"
                      onClick={handleRemovePhoto}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove photo
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <p className="text-xs text-muted-foreground">
                  This will be included in all conversations as context about you.
                </p>
                <textarea
                  id="bio"
                  placeholder="Tell the AI about yourself, your preferences, expertise, or anything you'd like it to remember..."
                  className="w-full min-h-[100px] px-3 py-2 bg-input border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <Button onClick={handleSaveChanges}>Save changes</Button>
            </CardContent>
          </Card>

          {/* Data Storage (Electron only) */}
          {dataPaths && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Data Storage
                </CardTitle>
                <CardDescription>
                  Local file locations for your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">User Data Directory</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md overflow-x-auto">
                      {dataPaths.userData}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleCopyPath(dataPaths.userData)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Database File</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md overflow-x-auto">
                      {dataPaths.database}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleCopyPath(dataPaths.database)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Settings File</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md overflow-x-auto">
                      {dataPaths.settings}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleCopyPath(dataPaths.settings)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Attachments Directory</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md overflow-x-auto">
                      {dataPaths.blobs}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleCopyPath(dataPaths.blobs)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div>
                  <p className="font-medium">Delete all chat and data</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete all conversations, messages, and attachments
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete all data</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all your
                        conversations, messages, branches, and uploaded files from local storage.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAllData}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete all data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

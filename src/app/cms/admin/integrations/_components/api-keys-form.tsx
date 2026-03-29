'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Save, Sparkles, AlertTriangle } from 'lucide-react';
import { updateApiKeysConfig, testGeminiApiKey } from '../../actions';
import type { SiteConfig } from '@/lib/types';
import { getFriendlyErrorMessage } from '@/lib/utils';

const apiKeysFormSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

type FormValues = z.infer<typeof apiKeysFormSchema>;

interface ApiKeysFormProps {
  initialData: SiteConfig;
}

export function ApiKeysForm({ initialData }: ApiKeysFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>(initialData.apiKeys?.google?.model ? [initialData.apiKeys.google.model] : []);

  const form = useForm<FormValues>({
    resolver: zodResolver(apiKeysFormSchema),
    defaultValues: {
      enabled: initialData.apiKeys?.google?.enabled ?? false,
      apiKey: initialData.apiKeys?.google?.apiKey || '',
      model: initialData.apiKeys?.google?.model || '',
    },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      try {
        await updateApiKeysConfig({ apiKeys: { google: data } });
        toast({
          title: 'Thành công!',
          description: 'Cấu hình API Keys đã được cập nhật.',
        });
        form.reset(data, { keepDirtyValues: true });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Lỗi!',
          description: getFriendlyErrorMessage(error, 'Không thể cập nhật cấu hình.'),
        });
      }
    });
  };

  const onTestApiKey = async () => {
    const key = form.getValues('apiKey');
    if (!key) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập API Key trước khi test.' });
        return;
    }
    
    setIsTesting(true);
    setAvailableModels([]); // Reset models

    try {
        const models = await testGeminiApiKey(key);
        setAvailableModels(models);
        
        // Auto select gemini-2.5-flash if available
        if (models.includes('gemini-2.5-flash') && !form.getValues('model')) {
             form.setValue('model', 'gemini-2.5-flash', { shouldDirty: true });
        } else if (models.length > 0 && !form.getValues('model')) {
             form.setValue('model', models[0], { shouldDirty: true });
        }

        toast({
            title: 'Test thành công!',
            description: `Đã tìm thấy ${models.length} model khả dụng cho khóa API này.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Test thất bại',
            description: getFriendlyErrorMessage(error),
        });
        form.setValue('model', ''); // Reset model invalid
    } finally {
        setIsTesting(false);
    }
  };

  const isGoogleAiEnabled = form.watch('enabled');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <Sparkles className="w-5 h-5 text-indigo-500" />
                   Google Gemini API (Genkit)
                </CardTitle>
                <CardDescription>
                    Sử dụng khóa API riêng của bạn để kết nối với Google Gemini. Hệ thống sẽ tự động ưu tiên sử dụng khóa này cho toàn bộ trải nghiệm AI CMS thay vì cài đặt mặc định (Environment Variable).
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Kích hoạt ghi đè API Key</FormLabel>
                            <FormDescription>
                              Nếu tắt, hệ thống sẽ sử dụng <code>GEMINI_API_KEY</code> mặc định trong môi trường biến.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {isGoogleAiEnabled && (
                        <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-900/50 space-y-4">
                            {!form.getValues('apiKey') && (
                                <div className="flex items-start gap-3 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-900">
                                    <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm">Bạn chưa cung cấp API Key. Các tính năng AI có thể sẽ bị lỗi nếu biến môi trường mặc định cũng không được cấu hình. Lấy khóa API miễn phí tại Google AI Studio.</p>
                                </div>
                            )}

                            <FormField
                                control={form.control}
                                name="apiKey"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Google AI API Key</FormLabel>
                                    <div className="flex gap-2">
                                        <FormControl>
                                            <Input type="password" placeholder="AIzaSy..." className="flex-1" {...field} />
                                        </FormControl>
                                        <Button 
                                            type="button" 
                                            variant="secondary" 
                                            onClick={onTestApiKey} 
                                            disabled={isTesting || !field.value}
                                        >
                                            {isTesting ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : null}
                                            Test & Tải LLM Models
                                        </Button>
                                    </div>
                                    <FormDescription>Khóa API của bạn được lưu trữ an toàn dưới database Firestore.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>LLM Model sử dụng</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value} 
                                        disabled={availableModels.length === 0}
                                    >
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Bấm 'Test' để tải danh sách các model khả dụng cho khóa AI đang nhập" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableModels.map(model => (
                                                <SelectItem key={model} value={model}>{model}</SelectItem>
                                            ))}
                                            {availableModels.length === 0 && field.value && (
                                                <SelectItem value={field.value}>{field.value}</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Mô hình khuyến nghị và tiết kiệm nhất cho tác vụ thương mại điện tử hiện tại là <b>gemini-2.5-flash</b>.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                </div>
            </CardContent>
             <CardFooter>
                 <Button type="submit" disabled={isPending || !form.formState.isDirty}>
                    {isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Lưu cấu hình AI
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

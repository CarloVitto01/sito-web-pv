// src/pages/MultiInputComponents/MultiInput.tsx
import React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useMediaQuery } from "@mantine/hooks";
import { IconUpload, IconTrash, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import type { FileHandler } from "../../types/FileHandler";
import Loading from "../LoadingComponents/Loading";

// ✅ Vite worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB: oltre l'upload a chunk gestisce comunque il trasferimento,
// ma un limite esplicito evita di far scegliere per sbaglio un file enorme senza nessun avviso

interface PropsContainer {
  onSendData: (value: FileHandler[], totalPages: number) => void;
}

const MultiInput: React.FC<PropsContainer> = ({ onSendData }) => {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery("(max-width: 520px)");

  const [files, setFiles] = React.useState<File[]>([]);
  const [numPages, setNumPages] = React.useState<number[]>([]);
  const [rejectMessage, setRejectMessage] = React.useState<string>("");

  const [isOpen, setIsOpen] = React.useState(false);
  const [currentFileIndex, setCurrentFileIndex] = React.useState<number | null>(null);
  const [pageNumber, setPageNumber] = React.useState<number>(1);

  const currentFile = currentFileIndex !== null ? files[currentFileIndex] : null;
  const currentFilePages = currentFileIndex !== null ? numPages[currentFileIndex] || 0 : 0;

  const totalPages = React.useMemo(() => numPages.reduce((acc, n) => acc + (n || 0), 0), [numPages]);
  React.useEffect(() => {
    const payload: FileHandler[] = files.map((file, i) => ({
      file,
      numPages: numPages[i] || 0,
    }));
    onSendData(payload, totalPages);
  }, [files, numPages, totalPages, onSendData]);

  const onDrop = (accepted: File[]) => {
    if (!accepted?.length) return;
    setRejectMessage("");
    setFiles((prev) => [...prev, ...accepted]);
  };

  const onReject = () => {
    setRejectMessage("Uno o più file superano i 300MB oppure non sono PDF validi.");
  };

  const onDocLoad = (index: number, pages: number) => {
    setNumPages((prev) => {
      const next = [...prev];
      next[index] = pages;
      return next;
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setNumPages((prev) => prev.filter((_, i) => i !== index));

    if (currentFileIndex === index) {
      setIsOpen(false);
      setCurrentFileIndex(null);
      setPageNumber(1);
    } else if (currentFileIndex !== null && index < currentFileIndex) {
      // se elimini un file prima di quello aperto, scala l'indice
      setCurrentFileIndex((i) => (i === null ? null : i - 1));
    }
  };

  const openPreview = (index: number) => {
    setCurrentFileIndex(index);
    setPageNumber(1);
    setIsOpen(true);
  };

  const closePreview = () => {
    setIsOpen(false);
    setCurrentFileIndex(null);
    setPageNumber(1);
  };

  const canPrev = pageNumber > 1;
  const canNext = currentFilePages > 0 && pageNumber < currentFilePages;

  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      style={{
        background: theme.white,
        borderColor: theme.colors.gray[3],
        boxShadow: theme.shadows.sm,
      }}
    >
      <Group justify="space-between" align="baseline" mb="sm">
        <Text fw={900} tt="uppercase" style={{ letterSpacing: 0.3, fontSize: 13, color: theme.colors.dark[7] }}>
          File PDF
        </Text>

        <Group gap={8}>
          <Badge variant="light" color="gray">
            {files.length} file
          </Badge>
          <Badge variant="light" color="gray">
            {totalPages} pagine
          </Badge>
        </Group>
      </Group>

      <Dropzone
        onDrop={onDrop}
        onReject={onReject}
        accept={["application/pdf"]}
        maxSize={MAX_FILE_SIZE}
        multiple
        radius="md"
        styles={{
          root: {
            borderColor: theme.colors.gray[3],
            background: theme.colors.gray[0],
          },
        }}
      >
        <Group justify="center" gap="sm" style={{ minHeight: 90 }}>
          <IconUpload size={18} />
          <Stack gap={2} align="center">
            <Text fw={800}>Trascina qui i PDF</Text>
            <Text size="sm" c="dimmed">
              oppure clicca per selezionare (max 300MB per file)
            </Text>
          </Stack>
        </Group>
      </Dropzone>

      {rejectMessage && (
        <Text size="sm" c="red" mt="xs">
          {rejectMessage}
        </Text>
      )}

      {files.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="md">
          {files.map((file, index) => (
            <Card
              key={`${file.name}-${index}`}
              withBorder
              radius="md"
              p="sm"
              style={{ borderColor: theme.colors.gray[3] }}
            >
              {/* ✅ Preview area cliccabile */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => openPreview(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openPreview(index);
                }}
                style={{
                  position: "relative",
                  width: "100%",
                  height: 220, // ✅ più alta (prima era 140)
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `1px solid ${theme.colors.gray[3]}`,
                  background: theme.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer", // ✅ manina
                }}
              >
                
                {/* ✅ Cestino in alto a destra */}
                <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
                  <Tooltip label="Elimina" withArrow>
                    <ActionIcon
                      variant="light"
                      color="red"
                      radius="md"
                      onClick={(e) => {
                        e.stopPropagation(); // ✅ non aprire il modal
                        removeFile(index);
                      }}
                      aria-label="Elimina file"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </div>

                {/* ✅ Badge pagine (opzionale ma utile, senza nome file) */}
                <div style={{ position: "absolute", bottom: 8, left: 8, zIndex: 2 }}>
                  <Badge variant="filled" color="dark" style={{ opacity: 0.85 }}>
                    {numPages[index] || 0} {numPages[index] === 1 ? "pagina" : "pagine"}
                  </Badge>
                </div>

                <Document
                  file={file}
                  onLoadSuccess={(data) => onDocLoad(index, data.numPages)}
                  loading={<Loading />}
                  error={<Text size="sm" c="dimmed">Anteprima non disponibile</Text>}
                >
                  <Page
                    pageNumber={1}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    height={200} // ✅ sfrutta meglio lo spazio
                    loading={<Loading />}
                    canvasBackground="white"
                  />
                </Document>
              </div>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* ✅ Modal anteprima */}
      <Modal
        opened={isOpen}
        onClose={closePreview}
        title={<Text fw={900}>Anteprima PDF</Text>}
        centered
        size={isMobile ? "md" : "lg"}
        radius="lg"
      >
        {currentFile ? (
          <Stack gap="sm">
            <div
              style={{
                width: "100%",
                borderRadius: 12,
                overflow: "hidden",
                border: `1px solid ${theme.colors.gray[3]}`,
                background: theme.white,
                display: "flex",
                justifyContent: "center",
                padding: 8,
              }}
            >
              <Document
                file={currentFile}
                loading={<Loading />}
                onLoadSuccess={(data) => {
                  if (currentFileIndex !== null) onDocLoad(currentFileIndex, data.numPages);
                }}
              >
                <Page
                  pageNumber={pageNumber}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  width={isMobile ? 300 : 420}
                  loading={<Loading />}
                  canvasBackground="white"
                />
              </Document>
            </div>

            <Group justify="space-between">
              <ActionIcon
                variant="light"
                color="gray"
                radius="md"
                onClick={() => canPrev && setPageNumber((p) => p - 1)}
                disabled={!canPrev}
                aria-label="Pagina precedente"
              >
                <IconChevronLeft size={18} />
              </ActionIcon>

              <Text size="sm" c="dimmed">
                Pagina {pageNumber} di {currentFilePages || 0}
              </Text>

              <ActionIcon
                variant="light"
                color="gray"
                radius="md"
                onClick={() => canNext && setPageNumber((p) => p + 1)}
                disabled={!canNext}
                aria-label="Pagina successiva"
              >
                <IconChevronRight size={18} />
              </ActionIcon>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </Card>
  );
};

export default React.memo(MultiInput);

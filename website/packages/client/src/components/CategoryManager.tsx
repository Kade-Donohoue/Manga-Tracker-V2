import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import type { categoryOption } from '../types';

import {
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  IconButton,
  Button,
  Grid,
  Skeleton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPath } from '../vars';
import { debounce } from '../utils';
import { toast } from 'react-toastify';
import { useUserCategories } from '../hooks/useUserCategories';

const SortableItem = ({
  item,
  onUpdate,
  onDelete,
}: {
  item: categoryOption;
  onUpdate: (updated: categoryOption) => void;
  onDelete: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.value,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Grid container alignItems="left" spacing={1} wrap="wrap">
        <Grid item>
          {
            <IconButton
              sx={{ touchAction: 'none', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
              {...listeners}
            >
              <DragIndicatorIcon />
            </IconButton>
          }
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField
            fullWidth
            size="small"
            label="Category Name"
            value={item.label}
            onChange={(e) => onUpdate({ ...item, label: e.target.value })}
          />
        </Grid>
        <Grid item>
          <TextField
            type="color"
            size="small"
            value={item.color}
            onChange={(e) => onUpdate({ ...item, color: e.target.value })}
            label="Color"
            InputLabelProps={{ shrink: true }}
            sx={{ width: 80 }}
          />
        </Grid>
        <Grid item>
          <FormControlLabel
            control={
              <Checkbox
                checked={item.stats}
                onChange={(e) => onUpdate({ ...item, stats: e.target.checked })}
              />
            }
            label="Stats"
          />
        </Grid>
        <Grid item>
          <FormControlLabel
            control={
              <Checkbox
                checked={item.public}
                onChange={(e) => onUpdate({ ...item, public: e.target.checked })}
              />
            }
            label="Public"
          />
        </Grid>
        <Grid item>
          {item.value.includes('user:') && (
            <IconButton color="error" onClick={onDelete}>
              <DeleteIcon />
            </IconButton>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

const SortableItemSkeleton = () => {
  return (
    <Box>
      <Grid container alignItems="left" spacing={1} wrap="wrap">
        <Grid item>
          <IconButton
            sx={{ touchAction: 'none', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
            disabled
          >
            <DragIndicatorIcon />
          </IconButton>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Skeleton variant="rounded" height={35} />
        </Grid>
        <Grid item>
          <Skeleton variant="rounded" height={35} width={80} />
        </Grid>
        <Grid item>
          <Skeleton variant="rectangular" width={100} height={35} />
        </Grid>
        <Grid item>
          <Skeleton variant="rectangular" width={100} height={35} />
        </Grid>
        <Grid item>
          <IconButton disabled>
            <DeleteIcon />
          </IconButton>
        </Grid>
      </Grid>
    </Box>
  );
};

const useSaveCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCats: categoryOption[]) => {
      const res = await fetch(`${fetchPath}/api/data/update/updateUserCategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCatList: newCats }),
      });
      if (!res.ok) {
        console.log(res);
        toast.error('Failed To Save Categories!');
        throw new Error('Failed to save categories');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCategories'] });
      queryClient.invalidateQueries({ queryKey: ['userManga', 'stats'] });
    },
  });
};

export function CategoryManager() {
  const { data: fetchedCategories, isLoading, isError } = useUserCategories();

  const saveMutation = useSaveCategories();
  const [categories, setCategories] = useState<categoryOption[]>([]);

  const debouncedSave = useRef(
    debounce((newCats: categoryOption[]) => {
      saveMutation.mutate(newCats);
    }, 500)
  ).current;

  useEffect(() => {
    if (fetchedCategories) {
      const sorted = [...fetchedCategories].sort((a, b) => a.position - b.position);
      setCategories(sorted.map((c, i) => ({ ...c, position: i })));
    }
  }, [fetchedCategories]);

  useEffect(() => {
    if (categories.length > 0) {
      debouncedSave(categories);
    }
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const updateCategory = (index: number, updated: categoryOption) => {
    const copy = [...categories];
    copy[index] = updated;
    setCategories(copy.map((c, i) => ({ ...c, position: i })));
  };

  const deleteCategory = (index: number) => {
    const copy = [...categories];
    copy.splice(index, 1);
    setCategories(copy.map((c, i) => ({ ...c, position: i })));
  };

  const handleDragEnd = (event: any) => {
    document.body.style.overflow = '';

    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = categories.findIndex((i) => i.value === active.id);
      const newIndex = categories.findIndex((i) => i.value === over.id);
      const reordered = arrayMove(categories, oldIndex, newIndex);
      setCategories(reordered.map((cat, idx) => ({ ...cat, position: idx })));
    }
  };

  if (isLoading)
    return (
      <Box>
        {Array.from({ length: 8 }).map((_, index) => (
          <SortableItemSkeleton key={index} />
        ))}
      </Box>
    );

  if (isError)
    return (
      <Box>
        <h1>Failed To Load Categories</h1>
      </Box>
    );

  return (
    <Box>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={(e) => (document.body.style.overflow = 'hidden')}
      >
        <SortableContext
          items={categories.map((c) => c.value)}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((cat, i) => (
            <Box key={cat.value} mb={1}>
              <SortableItem
                item={cat}
                onUpdate={(updated) => updateCategory(i, updated)}
                onDelete={() => deleteCategory(i)}
              />
            </Box>
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="outlined"
        onClick={() => {
          const newCategory: categoryOption = {
            value: `user:custom-${Date.now()}`,
            label: 'New Category',
            color: '#FFFFFF',
            stats: true,
            public: false,
            position: categories.length,
          };
          setCategories([...categories, newCategory].map((c, i) => ({ ...c, position: i })));
        }}
        sx={{ mt: 2 }}
      >
        Add Category
      </Button>
    </Box>
  );
}

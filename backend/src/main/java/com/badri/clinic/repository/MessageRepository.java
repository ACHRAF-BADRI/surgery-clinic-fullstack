package com.badri.clinic.repository;

import com.badri.clinic.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {

    List<Message> findByThreadIdOrderByCreatedAtAsc(String threadId);

    void deleteByThreadId(String threadId);
}
